#!/bin/bash
# Restart dev server cleanly
cd /home/z/my-project

# Kill any existing next processes
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 2

# Clear cache
rm -rf .next 2>/dev/null

# Start fresh dev server
nohup bash -c "exec /home/z/my-project/node_modules/.bin/next dev -p 3000" > /home/z/my-project/dev.log 2>&1 &
DEV_PID=$!
echo $DEV_PID > /home/z/my-project/.zscripts/dev.pid
echo "Started dev server PID=$DEV_PID"

# Wait for it to be ready
for i in $(seq 1 30); do
  sleep 2
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200\|304"; then
    echo "Server is ready after ${i} attempts"
    break
  fi
  echo "Attempt $i: server not ready yet"
done

# Final status
ps -p $DEV_PID > /dev/null 2>&1 && echo "Process is alive" || echo "Process died!"
tail -10 /home/z/my-project/dev.log
