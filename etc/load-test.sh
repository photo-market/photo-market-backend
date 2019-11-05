
ab -c100 -t10 http://localhost:8080/version

# -n requests     Number of requests to perform
# -c concurrency  Number of multiple requests to make at a time
# -s timeout      Seconds to max. wait for each response
# -k              Use HTTP KeepAlive feature