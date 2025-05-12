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
        $brokerList = config('kafka.brokers' , 'kafka_message:9092');

        $this->producer = KafkaProducerBuilder::create()
            ->withAdditionalBroker($brokerList)
            ->withAdditionalConfig([
                'metadata.broker.list' => $brokerList,
            ])
            ->build();
    }

    public function send(string $topic, array $payload): void
    {
        try {
            $message = KafkaProducerMessage::create($topic, 0) // partition 0
                ->withBody(json_encode($payload))
                ->withKey(uniqid());

            $this->producer->produce($message);

            \Log::info('Message Kafka envoyé au topic ' . $topic, ['payload' => $payload]);

        } catch (\Throwable $e) {
            \Log::error("Erreur Kafka : " . $e->getMessage());
        }
    }
}
