const rateLimiter = require('../../util/rate-limiter');
const { disconnectFromPage } = require('../../util/queue');
const {
  getPoolConnection,
  beginTransaction,
  commit,
  rollback,
  getUserTicketCount,
  checkSeatOwner,
  changeSeatsToEmpty,
  getSelectedSeats,
  getLockedSeats,
  changeSeatsToEmptyByUserId,
} = require('../models/seat.model');
const { getSeatId, getSeatsStatus, changeSeatsStatus } = require('../../models/seat.model');
const { checkSessionExist, checkAreaExist } = require('../../util/utils');
const { seatStatusId } = require('../../configs');
const ticketLimitPerSession = 4;
const { pubClient } = require('../../service/redis');
const limit = 1000000;
let chatroom;

module.exports = (io) => {
  async function checkLimit(sessionId) {
    const socket = this;
    const result = await rateLimiter(sessionId, socket.userId, limit);
    const userInfo = {
      socketId: socket.id,
      sessionId: sessionId,
    };
    await pubClient.hset('users', socket.userId, JSON.stringify(userInfo));
    io.to(socket.id).emit('check limit', result);
  }

  async function joinRoom(data) {
    const socket = this;
    chatroom = `${data.sessionId}-${data.areaId}`;
    socket.join(chatroom);
  }

  async function selectSeat(data) {
    console.log('select seat', data);
    const socket = this;
    const userId = socket.userId;
    const sessionId = data.sessionId;
    if (!sessionId) {
      return io.to(socket.id).emit('self select seat', {
        error: 'Please provide session ID.',
      });
    }

    const sessionExist = await checkSessionExist(sessionId);
    if (!sessionExist) {
      return io.to(socket.id).emit('self select seat', {
        error: 'Please provide a valid session ID.',
      });
    }

    const areaId = data.areaId;
    if (!areaId) {
      return io.to(socket.id).emit('self select seat', {
        error: 'Please provide an area ID.',
      });
    }

    const areaExist = await checkAreaExist(areaId);
    if (!areaExist) {
      return io.to(socket.id).emit('self select seat', {
        error: 'Please provide a valid area ID.',
      });
    }

    // console.log(sessionId, areaId, seats);
    const seatId = await getSeatId(data.row, data.column, areaId);
    if (!seatId) {
      return io.to(socket.id).emit('self select seat', {
        error: `Can not find row ${data.row}, column ${data.column} in area ${areaId}`,
      });
    }

    let count = await getUserTicketCount(userId, sessionId);
    console.log('count', count);

    if (count === ticketLimitPerSession) {
      return io.to(socket.id).emit('self select seat', {
        error: `一個帳號每個場次限購${ticketLimitPerSession}張門票（包含歷史訂單）！`,
        rowIndex: data.row - 1,
        columnIndex: data.column - 1,
      });
    }

    const connection = await getPoolConnection();
    try {
      await beginTransaction(connection);
      console.log('seatId', seatId);
      const seatStatus = await getSeatsStatus(sessionId, [seatId]);
      // console.log('seatStatus', seatStatus);
      if (seatStatus[0].status_id !== 1) {
        await rollback(connection);
        return io.to(socket.id).emit('self select seat', {
          error: '座位已經被搶走了～請重新選位!',
          rowIndex: data.row - 1,
          columnIndex: data.column - 1,
        });
      }

      await changeSeatsStatus(seatStatusId.OTHER_SELECTED, userId, sessionId, [seatId]);
      await commit(connection);
      io.to(socket.id).emit('self select seat', data);
      socket.to(chatroom).emit('other select seat', data);
      return;
    } catch (err) {
      console.log('err', err);
      await rollback(connection);
      return io.to(socket.id).emit('self select seat', {
        error: '系統錯誤，請稍後再試！',
      });
    } finally {
      connection.release();
    }
  }

  async function unselectSeat(data) {
    console.log('unselect seat', data);
    const socket = this;
    const userId = socket.userId;
    const sessionId = data.sessionId;
    if (!sessionId) {
      return io.to(socket.id).emit('unselect seat', {
        error: 'Please provide session ID.',
      });
    }

    const sessionExist = await checkSessionExist(sessionId);
    if (!sessionExist) {
      return io.to(socket.id).emit('unselect seat', {
        error: 'Please provide a valid session ID.',
      });
    }

    const areaId = data.areaId;
    if (!areaId) {
      return io.to(socket.id).emit('unselect seat', {
        error: 'Please provide an area ID.',
      });
    }

    const areaExist = await checkAreaExist(areaId);
    if (!areaExist) {
      return io.to(socket.id).emit('unselect seat', {
        error: 'Please provide a valid area ID.',
      });
    }

    let seatIds = [];
    for (const seat of data.tickets) {
      const seatId = await getSeatId(seat.row, seat.column, areaId);
      if (!seatId) {
        return io.to(socket.id).emit('unselect seat', {
          error: `Can not find row ${seat.row}, column ${seat.column} in area ${areaId}`,
        });
      }
      seatIds.push(seatId);
    }

    try {
      const seatStatus = await getSeatsStatus(sessionId, seatIds);
      // console.log('seatStatus', seatStatus);
      for (let seat of seatStatus) {
        if (seat.user_id !== userId) {
          return io.to(socket.id).emit('unselect seat', {
            error: `Seat ID(${seat.seat_id}) is not selected by User ID ${userId}`,
          });
        }
      }

      await changeSeatsToEmpty(sessionId, seatIds, userId);
      return socket.to(chatroom).emit('unselect seat', data);
    } catch (err) {
      console.log('err', err);
      return io.to(socket.id).emit('unselect seat', {
        error: '系統錯誤，請稍後再試！',
      });
    }
  }

  async function lockSeat(data) {
    console.log('lock seat', data);
    const socket = this;
    socket.to(chatroom).emit('lock seat', data);
  }

  async function unlockSeat(data) {
    console.log('unlock seat', data);
    const socket = this;
    const userId = socket.userId;
    try {
      const seatIds = [];
      if (!data.tickets) {
        return io.to(socket.id).emit('unlock seat', {
          error: 'No tickets received.',
        });
      }

      for (let seat of data.tickets) {
        seatIds.push(seat.seatId);
      }

      if (!data.sessionId) {
        return io.to(socket.id).emit('unlock seat', {
          error: 'Please provide session ID.',
        });
      }

      if (!seatIds.length) {
        return io.to(socket.id).emit('unlock seat', {
          error: 'Please provide at least one seat to unlock.',
        });
      }

      const owners = await checkSeatOwner(data.sessionId, seatIds);
      for (const owner of owners) {
        if (owner.user_id !== userId) {
          return io.to(socket.id).emit('unlock seat', {
            error: `Seat ID(${owner.seat_id}) is not locked by User ID ${userId}`,
          });
        }

        if (owner.status_id !== 2) {
          return io.to(socket.id).emit('unlock seat', {
            error: `Seat ID(${owner.seat_id}) does not have a lock status`,
          });
        }
      }

      await changeSeatsToEmpty(data.sessionId, seatIds);
      return socket.to(chatroom).emit('unlock seat', data);
    } catch (err) {
      console.log('err', err);
      return io.to(socket.id).emit('unlock seat', {
        error: 'MySQL Error.',
      });
    }
  }

  async function soldSeat(data) {
    console.log('sold seat', data);
    const socket = this;
    socket.to(chatroom).emit('sold seat', data);
  }

  async function disconnect() {
    console.log('disconnect');
    const socket = this;
    const userId = socket.userId;
    let userInfo = await pubClient.hget('users', userId);
    if (!userInfo) return;
    userInfo = JSON.parse(userInfo);
    console.log('userInfo', userInfo);
    const sessionId = userInfo.sessionId;

    // unselect disconnect user selected seats
    const unselectSeats = await unSelectSeatsByUserId(userId, sessionId);
    if (unselectSeats) socket.to(chatroom).emit('unselect seat', unselectSeats);

    // unlock disconnect user locked seats
    const unlockSeats = await unlockSeatsByUserId(userId, sessionId);
    if (unlockSeats) socket.to(chatroom).emit('unlock seat', unlockSeats);

    const result = await disconnectFromPage(sessionId, userId, limit);
    const isInQueue = result.inQueue;
    const notifyUsers = result.notifyUsers;

    if (!isInQueue) {
      console.log('inEvent');
      // no users waiting
      if (!notifyUsers.length) return;
      // notify togoUser
      const togoUser = notifyUsers.shift();
      const togoUserId = togoUser.userId;
      let togoUserInfo = await pubClient.hget('users', togoUserId);
      togoUserInfo = JSON.parse(togoUserInfo);
      const togoUserSocketId = togoUserInfo.socketId;
      io.to(togoUserSocketId).emit('ready to go');
    } else {
      console.log('inQueue');
    }

    // emit to all users in queue
    for (const user of notifyUsers) {
      let userInfo = await pubClient.hget('users', user.userId);
      userInfo = JSON.parse(userInfo);
      const socketId = userInfo.socketId;
      const data = {
        seconds: user.seconds,
      };
      io.to(socketId).emit('minus waiting people', data);
    }
  }

  async function unSelectSeatsByUserId(userId, sessionId) {
    try {
      const selectedSeats = await getSelectedSeats(userId, sessionId);
      console.log('selectedSeats', selectedSeats);
      // no selected seats
      if (!selectedSeats.length) return;
      let seatStatusIds = selectedSeats.map((selectedSeat) => selectedSeat.id);
      await changeSeatsToEmptyByUserId(seatStatusIds);
      const data = selectedSeats.map((selectedSeat) => {
        return {
          row: selectedSeat.row,
          column: selectedSeat.column,
        };
      });
      console.log('data', data);
      return {
        tickets: data,
      };
    } catch (err) {
      console.log('err', err);
      return {
        error: '系統錯誤，請稍後再試！',
      };
    }
  }

  async function unlockSeatsByUserId(userId, sessionId) {
    try {
      const lockedSeats = await getLockedSeats(userId, sessionId);
      // console.log('lockedSeats', lockedSeats);
      if (!lockedSeats.length) return;
      let seatStatusIds = lockedSeats.map((lockedSeat) => lockedSeat.id);
      await changeSeatsToEmptyByUserId(seatStatusIds);
      const data = lockedSeats.map((lockedSeat) => {
        return {
          row: lockedSeat.row,
          column: lockedSeat.column,
        };
      });
      // console.log('data', data);
      return {
        tickets: data,
      };
    } catch (err) {
      console.log('err', err);
      return {
        error: '系統錯誤，請稍後再試！',
      };
    }
  }

  return {
    checkLimit,
    joinRoom,
    selectSeat,
    unselectSeat,
    lockSeat,
    unlockSeat,
    soldSeat,
    disconnect,
  };
};
