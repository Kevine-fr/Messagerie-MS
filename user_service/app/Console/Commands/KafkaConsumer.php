<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use RdKafka\Consumer;
use RdKafka\ConsumerTopic;
use RdKafka\Conf;

class KafkaConsumer extends Command
{
    protected $signature = 'kafka:consume {topics=user.deleted,message.sended}';
    protected $description = 'Consomme les messages depuis Kafka pour plusieurs topics';

    private $messageCount = 0;

    public function handle()
    {
        $topics = explode(',', $this->argument('topics'));

        $conf = new Conf();
        $conf->set('group.id', config('kafka.group_id'));
        $conf->set('metadata.broker.list', config('kafka.brokers'));
        $conf->set('security.protocol', 'SASL_SSL');
        $conf->set('sasl.mechanisms', 'PLAIN');
        $conf->set('sasl.username', config('kafka.username'));
        $conf->set('sasl.password', config('kafka.password'));

        $consumer = new Consumer($conf);

        foreach ($topics as $topicName) {
            $topic = $consumer->newTopic($topicName);
            $topic->consumeStart(0, RD_KAFKA_OFFSET_BEGINNING);
            echo "Écoute du topic : $topicName\n";

            while (true) {
                $message = $topic->consume(0, 1000);

                if ($message === null) {
                    echo "En attente de message sur $topicName...\n";
                    sleep(1);
                    continue;
                }

                if ($message->err) {
                    echo "Erreur sur $topicName : " . $message->errstr() . "\n";
                    break;
                }

                echo "Message reçu de $topicName : " . $message->payload . "\n";
                $this->incrementMessageCount();
                echo "Total messages : $this->messageCount\n";
                sleep(1);
            }
        }
    }

    private function incrementMessageCount()
    {
        $this->messageCount++;
    }
}
