# TICKETCLUB

TICKETCLUB is a concert ticket-selling website that provides **queuing system**.

- Website Link: https://ticketclub.live/
- Frontend Repo: https://github.com/Claudia-teng/ticket-club
- Backend Repo: https://github.com/Claudia-teng/ticket-club
- Demo & Explanation Video: https://drive.google.com/file/d/14Ymsu-p7zLsXRVPCJwRd5a7_nN0MhaTr/view

## Tech Stack

- Backend: node.js, Express, Socket.IO
- Database: RDS(MySQL), Redis
- Cloud Service: EC2, Elastic Load Balance, Auto Scaling, CloudWatch EventBridge, Lambda
- CD: GitHub Action, Docker, Code Deploy

## Architecture Diagram

## Features

- Limit the number of people visiting the event selling page to prevent server crashes.
- Apply "queuing psychology" and calculate the estimated waiting time for each user by using **WebSocket** and **Redis** List & Hash.
- Use **Elastic Load Balancing** and **Auto Scaling** to scale out servers.
- Use **CloudWatch EventBridge** to schedule **Lambda** to warm up instances before each selling event starts.
- Update seat status (selected, locked, sold) by WebSocket during selling time to reduce race conditions.
- Implement continuous deployment by **GitHub Actions, Docker, Code Deploy** to automatically update app versions across multiple instances.

## Update Seat Status

Tools: Socket.IO, MySQL Lock

- Update seat status immediately to avoid two users getting the same seat at the same time as mush as possible
- Reduce race conditions to avoid affecting database performance
- Use MySQL lock to ensure every seat can only be successfully selected by one user.

## Queuing System

- Limit the number of people visiting the event selling page to prevent server crashes.
- Apply "queuing psychology" and calculate the estimated waiting time for each user by using **WebSocket** and **Redis** List & Hash.

### How I implement queuing system?

Tool: Redis (List & Hash)

1. Use a list to record the order of people entering ticket selling page, and Hash to record the timestamp of each user entering the ticket selling page.
2. If the number of people inside the page reaches the limit, another ist will record the queuing order.
3. There is a 10-minute time limit for ticket purchases process. After 10 minutes, that user will be kicked out from the page.
4. First user in the queuing list will be navigated to ticket selling page.

For example:

1. If the limit of visiting ticket selling page is set to 3...
2. User 1 arrived, successfully get into ticket selling page.
3. User 2 arrived, successfully get into ticket selling page.
4. User 3 arrived, successfully get into ticket selling page.
5. User 4 arrived, failed to get into ticket selling page, placed in the 1th in queue.
6. User 5 arrived, failed to get into ticket selling page, placed in the 2nd in queue.
7. User 6 arrived, failed to get into ticket selling page, placed in the 3nd in queue.
8. User 7 arrived, failed to get into ticket selling page, placed in the 4th in queue.

**Calculate estimated waiting time**

1. User 4 need to wait 1 person, and it's waiting time is (10 minutes - User 1's timestamp).
2. User 5 need to wait 2 people, and it's waiting time is (10 minutes - User 2's timestamp).
3. User 6 need to wait 3 people, and it's waiting time is (10 minutes - User 3's timestamp).
4. User 7 need to wait 4 people, and it's waiting time is (10 minutes - User 1's timestamp) + 10 minutes.

**Senario 1: User 1 completed a purchase**

1. Let first user in the queue (User 4) to get into the page.
2. Get all users in queue, and update their waiting information.
3. Update User 5's waiting info: wait for 1 person, waiting time is (10 minutes - User 2's timestamp).
4. Update User 6's waiting info: wait for 2 person, waiting time is (10 minutes - User 3's timestamp).

**Senario 2: User 4 left the queue**

1. Find Users queuing behind User 4, and update their waiting information
2. Update User 5's waiting info: wait for 1 person, waiting time is (10 minutes - User 1's timestamp).
3. Update User 6's waiting info: wait for 1 person, waiting time is (10 minutes - User 2's timestamp).

**Senario 3: User 2 left the page without buying**

1. Let first user in the queue (User 4) to get into the page.
2. Get all users in queue, and update their waiting information.
3. Update User 5's waiting info: wait for 1 person, waiting time is (10 minutes - User 1's timestamp).
4. Update User 6's waiting info: wait for 1 person, waiting time is (10 minutes - User 2's timestamp).

## Load test

Concert ticket selling website must be capable of handling high traffic. Thus I tried both horizontal and vertical scaling and compare two methods scaling results & payments.

### Horizontal Scaling

### Vertical Scaling

To conclude, in this case vertical scaling has a better performance with a lower cost.
