<?php

namespace App\Services;

use Jobcloud\Kafka\Message\KafkaProducerMessage;
use Jobcloud\Kafka\Producer\KafkaProducerBuilder;
use Jobcloud\Kafka\Producer\KafkaProducerInterface;
use Jobcloud\Kafka\Producer\KafkaProducerException;

class KafkaProducerService
{
    protected KafkaProducerInterface $producer;

    /**
     * PLAINTEXT par defaut (Kafka auto-heberge). Si un username/password Kafka
     * est configure (Confluent Cloud, etc.), on bascule automatiquement en SASL_SSL.
     */
    public function __construct()
    {
        $brokerList = config('kafka.brokers', 'kafka:9092');
        $username = config('kafka.username');
        $password = config('kafka.password');

        $config = ['metadata.broker.list' => $brokerList];

        if (!empty($username) && !empty($password)) {
            $config = array_merge($config, [
                'security.protocol' => 'SASL_SSL',
                'sasl.mechanisms' => 'PLAIN',
                'sasl.username' => $username,
                'sasl.password' => $password,
                'ssl.endpoint.identification.algorithm' => 'https',
            ]);
        }

        $this->producer = KafkaProducerBuilder::create()
            ->withAdditionalBroker($brokerList)
            ->withAdditionalConfig($config)
            ->build();
    }

    public function send(string $topic, array $payload): void
    {
        try {
            $message = KafkaProducerMessage::create($topic, 0)
                ->withBody(json_encode($payload))
                ->withKey(uniqid());

                $this->producer->produce($message);
                $this->producer->flush(10000);


            \Log::info('Message Kafka envoyé au topic ' . $topic, ['payload' => $payload]);

        } catch (\Throwable $e) {
            \Log::error("Erreur Kafka : " . $e->getMessage());
        }
    }
}
