<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use RdKafka\Consumer;
use RdKafka\Message;
use RdKafka\KafkaConsumer;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\UserController;

class KafkaMessageConsumer extends Command
{
    protected $signature = 'kafka:consume-messages {topics=user.deleted,message.created}';
    protected $description = 'Consomme les messages depuis Kafka pour plusieurs topics';
    private $messageCount = 0;

    // Dictionnaire des topics vers les callbacks
    private $topicHandlers = [];

    public function __construct()
    {
        parent::__construct();

        // Associer chaque topic à un contrôleur et méthode
        $this->topicHandlers = [
            'message.created' => [UserController::class, 'Test'],
            'user.deleted' => [UserController::class, 'GetAllUsers'],
        ];
    }

    public function handle()
    {
        $topics = explode(',', $this->argument('topics'));

        $conf = new \RdKafka\Conf();
        
        $conf->set('allow.auto.create.topics', 'true');
        $conf->set('group.id', 'laravel-consumer-group');
        $conf->set('metadata.broker.list', config('kafka.brokers', 'kafka_message:9092'));
        $conf->set('enable.auto.commit', 'true');

        $consumer = new KafkaConsumer($conf);
        $consumer->subscribe($topics);

        $this->info("✅ En écoute sur les topics : " . implode(', ', $topics));

        while (true) {
            $message = $consumer->consume(1000);

            switch ($message->err) {
                case RD_KAFKA_RESP_ERR_NO_ERROR:
                    $topic = $message->topic_name;
                    $payload = $message->payload;

                    $this->info("📥 [$topic] Message: $payload");

                    $this->messageCount++;
                    $this->line("🔢 Total messages: {$this->messageCount}");

                    if (isset($this->topicHandlers[$topic])) {
                        [$controllerClass, $method] = $this->topicHandlers[$topic];
                        $controller = app($controllerClass);

                        if (method_exists($controller, $method)) {
                            $controller->$method(json_decode($payload, true));
                        } else {
                            $this->error("❌ Méthode non trouvée: {$method} dans {$controllerClass}");
                        }
                    } else {
                        $this->warn("⚠️ Aucun handler défini pour le topic {$topic}");
                    }
                    break;

                case RD_KAFKA_RESP_ERR__PARTITION_EOF:
                    // Partition terminée
                    break;

                case RD_KAFKA_RESP_ERR__TIMED_OUT:
                    // Timeout d'écoute
                    break;

                default:
                    $this->error("❌ Erreur Kafka: {$message->errstr()}");
                    break;
            }

            usleep(500000); // Pause de 0.5 seconde
        }
    }
}
