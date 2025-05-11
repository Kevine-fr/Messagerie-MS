<?php 

return [
    'brokers' => env('KAFKA_BROKERS', 'pkc-xxxxx.us-central1.gcp.confluent.cloud:9092'),
    'username' => env('KAFKA_USERNAME'),
    'password' => env('KAFKA_PASSWORD'),
    'group_id' => env('KAFKA_GROUP_ID'),
];


