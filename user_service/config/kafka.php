<?php 

return [
    'brokers' => env('KAFKA_BROKERS', 'kafka_messagerie:9092'), // Remplace avec ton serveur Kafka
    'group_id' => env('KAFKA_GROUP_ID', 'my-group-id'),
    'auto_offset_reset' => 'earliest', // Option pour consommer depuis le début des messages
    // autres configurations...
];

