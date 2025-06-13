<?php

namespace App\Services;

use Jobcloud\Kafka\Message\KafkaProducerMessage;
use Jobcloud\Kafka\Producer\KafkaProducerBuilder;
use Jobcloud\Kafka\Producer\KafkaProducerInterface;
use Jobcloud\Kafka\Producer\KafkaProducerException;

class KafkaProducerService
{
    protected KafkaProducerInterface $producer;

    public function __construct()
    {
        $brokerList = config('kafka.brokers');
        $username = config('kafka.username');
        $password = config('kafka.password');

        $this->producer = KafkaProducerBuilder::create()
            ->withAdditionalBroker($brokerList)
            ->withAdditionalConfig([
                'security.protocol' => 'SASL_SSL',
                'sasl.mechanisms' => 'PLAIN',
                'sasl.username' => $username,
                'sasl.password' => $password,
                'ssl.endpoint.identification.algorithm' => 'https',
            ])
            ->build();

    }

    public function send(string $topic, array $payload): void
    {
        try {
            $message = KafkaProducerMessage::create($topic, 0) 
                ->withBody(json_encode($payload))
                ->withKey(uniqid());

            $this->producer->produce($message);

            \Log::info('Message Kafka envoyé au topic ' . $topic, ['payload' => $payload]);

        } catch (\Throwable $e) {
            \Log::error("Erreur Kafka : " . $e->getMessage());
        }
    }
}
