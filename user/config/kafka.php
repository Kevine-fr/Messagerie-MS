<?php 

return [
    'brokers' => env('KAFKA_BROKERS', 'kafka:9092'),
    'username' => env('KAFKA_USERNAME'),
    'password' => env('KAFKA_PASSWORD'),
    'group_id' => env('KAFKA_GROUP_ID', 'user-service-group'),
];
