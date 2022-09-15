FROM redis
COPY redis.conf /usr/local/etc/redis/redis.conf 
COPY users.acl /etc/redis/users.acl
CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]