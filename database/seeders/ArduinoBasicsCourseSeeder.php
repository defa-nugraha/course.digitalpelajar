<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ArduinoBasicsCourseSeeder extends Seeder
{
    private const COURSE_SLUG = 'dasar-arduino-lengkap-dari-nol';

    public function run(): void
    {
        DB::transaction(function () {
            $now = now();
            $pathId = $this->learningPathId($now);
            $instructorId = $this->instructorId($now);
            $courseId = $this->courseId($pathId, $instructorId, $now);

            DB::table('quizzes')->where('course_id', $courseId)->delete();

            $chapterIds = DB::table('chapters')->where('course_id', $courseId)->pluck('id');
            if ($chapterIds->isNotEmpty()) {
                $lessonIds = DB::table('lessons')->whereIn('chapter_id', $chapterIds)->pluck('id');
                DB::table('content_blocks')->whereIn('lesson_id', $lessonIds)->delete();
                DB::table('lessons')->whereIn('chapter_id', $chapterIds)->delete();
                DB::table('chapters')->where('course_id', $courseId)->delete();
            }

            foreach ($this->chapters() as $chapterIndex => $chapter) {
                $chapterId = DB::table('chapters')->insertGetId([
                    'course_id' => $courseId,
                    'title' => $chapter['title'],
                    'order_no' => $chapterIndex + 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                foreach ($chapter['lessons'] as $lessonIndex => $lesson) {
                    $lessonId = DB::table('lessons')->insertGetId([
                        'chapter_id' => $chapterId,
                        'title' => $lesson['title'],
                        'order_no' => $lessonIndex + 1,
                        'is_required' => true,
                        'available_at' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);

                    foreach ($lesson['blocks'] as $blockIndex => $block) {
                        DB::table('content_blocks')->insert([
                            'lesson_id' => $lessonId,
                            'type' => $block['type'],
                            'content' => $block['content'],
                            'metadata' => json_encode($block['metadata'] ?? ['source' => 'arduino_basics_seeder']),
                            'order_no' => $blockIndex + 1,
                            'status' => 'published',
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }
                }

                DB::table('quizzes')->insert([
                    'lesson_id' => null,
                    'course_id' => $courseId,
                    'title' => 'Quiz Chapter '.($chapterIndex + 1).': '.$chapter['quiz_title'],
                    'order_no' => $chapterIndex + 1,
                    'passing_score' => 70,
                    'is_final_exam' => false,
                    'questions' => json_encode($chapter['questions']),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            DB::table('quizzes')->insert([
                'lesson_id' => null,
                'course_id' => $courseId,
                'title' => 'Ujian Akhir: Dasar Arduino Lengkap',
                'order_no' => 99,
                'passing_score' => 75,
                'is_final_exam' => true,
                'questions' => json_encode([
                    ['question' => 'Jelaskan fungsi setup() dan loop() pada sketch Arduino.', 'answer' => 'setup() berjalan sekali untuk inisialisasi, loop() berjalan berulang untuk logika utama.'],
                    ['question' => 'Apa perbedaan digitalRead dan analogRead?', 'answer' => 'digitalRead membaca HIGH/LOW, analogRead membaca nilai ADC 0 sampai 1023 pada pin analog.'],
                    ['question' => 'Mengapa resistor diperlukan saat memakai LED?', 'answer' => 'Resistor membatasi arus agar LED dan pin Arduino tidak rusak.'],
                    ['question' => 'Sebutkan langkah debugging saat sensor tidak terbaca.', 'answer' => 'Periksa wiring VCC/GND/sinyal, alamat atau pin, library, baud rate Serial, dan uji dengan sketch minimal.'],
                    ['question' => 'Rancang ringkas proyek monitoring suhu dengan alarm.', 'answer' => 'Baca sensor suhu, tampilkan via Serial/LCD, bandingkan dengan batas, aktifkan buzzer atau LED saat melewati threshold.'],
                ]),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });
    }

    private function learningPathId(mixed $now): int
    {
        $existingId = DB::table('learning_paths')->where('slug', 'arduino-maker-path')->value('id');

        $data = [
            'title' => 'Arduino Maker Path',
            'description' => 'Jalur belajar Arduino dari elektronika dasar, pemrograman C/C++, sensor, aktuator, komunikasi data, hingga proyek mandiri.',
            'level' => 'beginner-to-advanced',
            'status' => 'published',
            'meta_title' => 'Arduino Maker Path | RoboAcademy',
            'meta_description' => 'Jalur belajar Arduino lengkap dari dasar elektronika hingga proyek mikrokontroler siap demo.',
            'updated_at' => $now,
        ];

        if ($existingId) {
            DB::table('learning_paths')->where('id', $existingId)->update($data);

            return (int) $existingId;
        }

        return DB::table('learning_paths')->insertGetId([
            ...$data,
            'slug' => 'arduino-maker-path',
            'created_at' => $now,
        ]);
    }

    private function instructorId(mixed $now): int
    {
        $existingId = DB::table('users')->where('email', 'mentor-arduino@example.test')->value('id');

        if ($existingId) {
            return (int) $existingId;
        }

        return DB::table('users')->insertGetId([
            'school_id' => DB::table('schools')->where('status', 'active')->value('id'),
            'name' => 'Mentor Arduino RoboAcademy',
            'email' => 'mentor-arduino@example.test',
            'email_verified_at' => $now,
            'role' => 'internal_instructor',
            'status' => 'active',
            'password' => Hash::make('password'),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function courseId(int $pathId, int $instructorId, mixed $now): int
    {
        $data = [
            'learning_path_id' => $pathId,
            'learning_path_order' => 1,
            'instructor_id' => $instructorId,
            'certificate_template_id' => null,
            'title' => 'Dasar Arduino Lengkap: Dari Nol hingga Proyek Sensor',
            'description' => 'Kursus dasar Arduino yang sangat lengkap untuk pemula. Materi dimulai dari konsep mikrokontroler, elektronika dasar, instalasi IDE, digital input/output, analog input, PWM, Serial Monitor, sensor, aktuator, LCD, debugging, hingga final project monitoring suhu dan cahaya.',
            'level' => 'beginner',
            'price_type' => 'free',
            'price' => 0,
            'access_mode' => 'sequential',
            'status' => 'published',
            'meta_title' => 'Dasar Arduino Lengkap | RoboAcademy',
            'meta_description' => 'Belajar Arduino dari nol sampai membuat proyek sensor lengkap dengan wiring, kode, debugging, quiz, dan final project.',
            'canonical_url' => url('/produk/'.self::COURSE_SLUG),
            'og_image' => '/logo.png',
            'updated_at' => $now,
        ];

        $existingId = DB::table('courses')->where('slug', self::COURSE_SLUG)->value('id');

        if ($existingId) {
            DB::table('courses')->where('id', $existingId)->update($data);

            return (int) $existingId;
        }

        return DB::table('courses')->insertGetId([
            ...$data,
            'slug' => self::COURSE_SLUG,
            'created_at' => $now,
        ]);
    }

    private function chapters(): array
    {
        return [
            [
                'title' => 'Chapter 1: Fondasi Arduino dan Keselamatan Kerja',
                'quiz_title' => 'Fondasi Arduino',
                'questions' => [
                    ['question' => 'Arduino Uno memakai mikrokontroler apa?', 'answer' => 'ATmega328P'],
                    ['question' => 'Mengapa breadboard membantu pemula?', 'answer' => 'Breadboard memungkinkan rangkaian dibuat tanpa solder sehingga mudah diuji dan diperbaiki.'],
                ],
                'lessons' => [
                    [
                        'title' => 'Apa itu Arduino dan Kapan Digunakan?',
                        'blocks' => [
                            $this->text('Arduino adalah platform mikrokontroler open-source untuk membaca input, menjalankan logika, dan mengendalikan output. Arduino cocok untuk prototipe robot, alat ukur, otomasi sederhana, media belajar elektronika, dan Internet of Things dasar.'),
                            $this->checklist(['Pahami perbedaan mikrokontroler dan komputer', 'Kenali board Arduino Uno, Nano, Mega, dan ESP32', 'Identifikasi input seperti tombol/sensor dan output seperti LED/motor']),
                            $this->note('Pada course ini board acuan adalah Arduino Uno. Jika memakai Nano atau Mega, konsepnya tetap sama tetapi nomor pin dan driver bisa berbeda.'),
                        ],
                    ],
                    [
                        'title' => 'Komponen Wajib dan Aturan Keselamatan',
                        'blocks' => [
                            $this->text('Komponen minimal: Arduino Uno, kabel USB, breadboard, jumper, LED, resistor 220Ω/330Ω, push button, potensiometer, buzzer, sensor LDR, DHT11/DHT22, servo SG90, sensor HC-SR04, dan LCD I2C.'),
                            $this->warning('Jangan menghubungkan pin 5V langsung ke GND. Jangan memberi arus besar langsung dari pin digital. Motor DC, relay, dan beban induktif harus memakai driver/transistor dan catu daya yang sesuai.'),
                            $this->checklist(['Matikan power sebelum mengubah wiring', 'Cek polaritas LED, buzzer, dan kapasitor', 'Gunakan resistor pembatas arus', 'Rapikan kabel agar tidak short']),
                        ],
                    ],
                    [
                        'title' => 'Struktur Board Arduino Uno',
                        'blocks' => [
                            $this->text('Arduino Uno memiliki pin digital D0-D13, pin analog A0-A5, pin power 5V/3.3V/GND/Vin, port USB, regulator tegangan, tombol reset, dan LED onboard pada pin 13.'),
                            $this->note('Pin D0 dan D1 dipakai untuk komunikasi Serial USB. Hindari memakai pin ini untuk sensor saat sedang debugging Serial Monitor.'),
                            $this->checklist(['Temukan pin GND', 'Temukan pin 5V', 'Temukan LED built-in pin 13', 'Temukan A0 untuk analog input']),
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Chapter 2: Setup Software dan Sketch Pertama',
                'quiz_title' => 'IDE dan Struktur Program',
                'questions' => [
                    ['question' => 'Fungsi setup() dijalankan berapa kali?', 'answer' => 'Sekali saat board menyala atau reset.'],
                    ['question' => 'Apa fungsi pinMode?', 'answer' => 'Mengatur mode pin sebagai INPUT, INPUT_PULLUP, atau OUTPUT.'],
                ],
                'lessons' => [
                    [
                        'title' => 'Install Arduino IDE dan Pilih Board',
                        'blocks' => [
                            $this->text('Install Arduino IDE, hubungkan board via USB, pilih Tools > Board > Arduino Uno, lalu pilih port serial yang muncul. Jika port tidak muncul, cek kabel data, driver CH340/ATmega16U2, dan permission USB.'),
                            $this->checklist(['Arduino IDE terinstall', 'Board Arduino Uno dipilih', 'Port serial terdeteksi', 'Sketch Blink berhasil di-upload']),
                            $this->warning('Sebagian kabel USB hanya untuk charging dan tidak membawa data. Gunakan kabel data jika port tidak muncul.'),
                        ],
                    ],
                    [
                        'title' => 'Anatomi Sketch: setup(), loop(), Komentar',
                        'blocks' => [
                            $this->text('Sketch Arduino minimal memiliki setup() dan loop(). setup() dipakai untuk inisialisasi, loop() untuk instruksi yang terus berulang. Komentar membantu menjelaskan wiring dan alasan kode.'),
                            $this->code("void setup() {\n  pinMode(13, OUTPUT); // LED onboard\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n  digitalWrite(13, LOW);\n  delay(500);\n}", 'blink_basic.ino'),
                            $this->note('Biasakan menyimpan nama pin ke konstanta agar kode mudah dibaca dan diubah.'),
                        ],
                    ],
                    [
                        'title' => 'Upload, Error Compile, dan Error Port',
                        'blocks' => [
                            $this->text('Error compile biasanya berasal dari typo, tanda kurung kurang, titik koma hilang, atau library belum terpasang. Error upload sering terkait port salah, board salah, kabel, driver, atau pin D0/D1 terpakai.'),
                            $this->checklist(['Baca pesan error dari baris paling awal', 'Pastikan board dan port benar', 'Lepas koneksi pada D0/D1 saat upload', 'Tekan reset jika bootloader lambat']),
                            $this->warning('Jangan langsung mengganti board saat error. Selalu uji dulu dengan contoh Blink yang paling sederhana.'),
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Chapter 3: Elektronika Dasar untuk Arduino',
                'quiz_title' => 'Elektronika Dasar',
                'questions' => [
                    ['question' => 'Apa fungsi resistor pada rangkaian LED?', 'answer' => 'Membatasi arus agar LED dan pin Arduino aman.'],
                    ['question' => 'Apa beda seri dan paralel?', 'answer' => 'Seri berbagi arus yang sama, paralel berbagi tegangan yang sama.'],
                ],
                'lessons' => [
                    [
                        'title' => 'Tegangan, Arus, Resistansi, dan Ground',
                        'blocks' => [
                            $this->text('Tegangan adalah beda potensial, arus adalah aliran muatan, resistansi adalah hambatan. Semua modul harus memiliki referensi ground yang sama agar sinyal terbaca benar.'),
                            $this->note('Arduino Uno bekerja pada logika 5V. Modul 3.3V bisa rusak jika diberi sinyal 5V tanpa level shifting.'),
                            $this->checklist(['Bedakan VCC dan GND', 'Jangan hubungkan 5V ke GND', 'Gunakan common ground untuk sensor eksternal']),
                        ],
                    ],
                    [
                        'title' => 'LED, Resistor, dan Hukum Ohm',
                        'blocks' => [
                            $this->text('LED harus memakai resistor seri. Untuk LED merah 5V dengan arus target sekitar 10-15mA, resistor 220Ω atau 330Ω umum digunakan.'),
                            $this->code("const int ledPin = 8;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(ledPin, HIGH);\n  delay(1000);\n  digitalWrite(ledPin, LOW);\n  delay(1000);\n}", 'external_led_blink.ino'),
                            $this->warning('LED memiliki polaritas. Kaki panjang biasanya anoda (+), kaki pendek katoda (-).'),
                        ],
                    ],
                    [
                        'title' => 'Breadboard dan Membaca Wiring',
                        'blocks' => [
                            $this->text('Breadboard memiliki jalur horizontal pada area terminal dan jalur power rail di samping. Pahami jalurnya sebelum menancapkan komponen agar tidak membuat short.'),
                            $this->checklist(['Gunakan warna merah untuk 5V', 'Gunakan hitam/biru untuk GND', 'Pisahkan area input dan output', 'Foto wiring sebelum presentasi proyek']),
                            $this->submission('Buat rangkaian LED eksternal pada pin 8. Kirim foto wiring dan kode Blink yang sudah diberi komentar.'),
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Chapter 4: Digital Input/Output',
                'quiz_title' => 'Digital IO',
                'questions' => [
                    ['question' => 'Apa nilai yang dibaca digitalRead?', 'answer' => 'HIGH atau LOW.'],
                    ['question' => 'Apa manfaat INPUT_PULLUP?', 'answer' => 'Mengaktifkan resistor pull-up internal sehingga tombol bisa stabil tanpa resistor eksternal.'],
                ],
                'lessons' => [
                    [
                        'title' => 'digitalWrite dan Pola LED',
                        'blocks' => [
                            $this->text('digitalWrite mengatur pin output menjadi HIGH atau LOW. Dari satu LED, pola bisa berkembang menjadi indikator status, traffic light, dan alarm.'),
                            $this->code("const int red = 8;\nconst int yellow = 9;\nconst int green = 10;\n\nvoid setup() {\n  pinMode(red, OUTPUT);\n  pinMode(yellow, OUTPUT);\n  pinMode(green, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(green, HIGH); delay(2000); digitalWrite(green, LOW);\n  digitalWrite(yellow, HIGH); delay(500); digitalWrite(yellow, LOW);\n  digitalWrite(red, HIGH); delay(2000); digitalWrite(red, LOW);\n}", 'traffic_light.ino'),
                            $this->note('Hindari copy-paste besar. Setelah berhasil, refactor memakai fungsi helper.'),
                        ],
                    ],
                    [
                        'title' => 'Membaca Tombol dengan INPUT_PULLUP',
                        'blocks' => [
                            $this->text('Tombol bisa dibaca dengan digitalRead. Mode INPUT_PULLUP membuat pin normal HIGH dan menjadi LOW saat tombol ditekan ke GND.'),
                            $this->code("const int buttonPin = 2;\nconst int ledPin = 8;\n\nvoid setup() {\n  pinMode(buttonPin, INPUT_PULLUP);\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  bool pressed = digitalRead(buttonPin) == LOW;\n  digitalWrite(ledPin, pressed ? HIGH : LOW);\n}", 'button_pullup.ino'),
                            $this->warning('Dengan INPUT_PULLUP, logika tombol terbalik: ditekan = LOW. Ini bukan error.'),
                        ],
                    ],
                    [
                        'title' => 'Debounce Tombol',
                        'blocks' => [
                            $this->text('Kontak mekanik tombol dapat memantul sehingga satu tekanan terbaca berkali-kali. Debounce dapat dilakukan dengan jeda pendek atau logika millis().'),
                            $this->code("const int buttonPin = 2;\nint lastReading = HIGH;\nunsigned long lastChange = 0;\n\nvoid setup() {\n  pinMode(buttonPin, INPUT_PULLUP);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int reading = digitalRead(buttonPin);\n  if (reading != lastReading) {\n    lastChange = millis();\n    lastReading = reading;\n  }\n\n  if (millis() - lastChange > 50 && reading == LOW) {\n    Serial.println(\"Tombol stabil ditekan\");\n  }\n}", 'button_debounce.ino'),
                            $this->submission('Buat tombol yang menyalakan LED dan tampilkan status tombol di Serial Monitor. Sertakan foto wiring, kode, dan catatan debounce.'),
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Chapter 5: Analog Input, PWM, dan Kalibrasi',
                'quiz_title' => 'Analog dan PWM',
                'questions' => [
                    ['question' => 'Rentang nilai analogRead pada Arduino Uno?', 'answer' => '0 sampai 1023.'],
                    ['question' => 'Rentang nilai analogWrite PWM?', 'answer' => '0 sampai 255.'],
                ],
                'lessons' => [
                    [
                        'title' => 'Membaca Potensiometer dan ADC',
                        'blocks' => [
                            $this->text('analogRead membaca tegangan pada pin analog dan mengubahnya menjadi nilai 0-1023. Nilai ini dapat dipetakan ke persen, sudut servo, atau tingkat kecerahan.'),
                            $this->code("const int potPin = A0;\n\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int value = analogRead(potPin);\n  float voltage = value * (5.0 / 1023.0);\n  Serial.print(value);\n  Serial.print(\" | \");\n  Serial.println(voltage);\n  delay(200);\n}", 'potentiometer_read.ino'),
                            $this->note('ADC Arduino Uno 10-bit berarti memiliki 1024 kemungkinan nilai.'),
                        ],
                    ],
                    [
                        'title' => 'PWM untuk Mengatur Kecerahan LED',
                        'blocks' => [
                            $this->text('PWM membuat output digital berkedip sangat cepat sehingga terlihat seperti tegangan analog rata-rata. Pada Uno, pin PWM ditandai dengan simbol ~.'),
                            $this->code("const int ledPin = 9;\nconst int potPin = A0;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  int sensor = analogRead(potPin);\n  int brightness = map(sensor, 0, 1023, 0, 255);\n  analogWrite(ledPin, brightness);\n}", 'pwm_led_pot.ino'),
                            $this->checklist(['Gunakan pin PWM', 'Map 0-1023 ke 0-255', 'Uji perubahan kecerahan perlahan']),
                        ],
                    ],
                    [
                        'title' => 'Kalibrasi Sensor LDR',
                        'blocks' => [
                            $this->text('Sensor analog perlu dikalibrasi karena kondisi ruangan berbeda. Catat nilai minimum dan maksimum pada kondisi gelap/terang, lalu gunakan threshold yang masuk akal.'),
                            $this->code("const int ldrPin = A0;\nconst int ledPin = 8;\nint threshold = 500;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int light = analogRead(ldrPin);\n  Serial.println(light);\n  digitalWrite(ledPin, light < threshold ? HIGH : LOW);\n  delay(200);\n}", 'ldr_threshold.ino'),
                            $this->submission('Buat lampu otomatis berbasis LDR. Kirim nilai kalibrasi terang/gelap, foto wiring, kode, dan video demonstrasi.'),
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Chapter 6: Serial Monitor, Sensor, dan Library',
                'quiz_title' => 'Serial dan Sensor',
                'questions' => [
                    ['question' => 'Mengapa baud rate Serial Monitor harus sama?', 'answer' => 'Agar data serial diterjemahkan dengan kecepatan yang sama dan tidak menjadi karakter acak.'],
                    ['question' => 'Apa fungsi library Arduino?', 'answer' => 'Menyediakan kode siap pakai untuk modul/sensor agar lebih mudah digunakan.'],
                ],
                'lessons' => [
                    [
                        'title' => 'Serial Monitor untuk Debugging',
                        'blocks' => [
                            $this->text('Serial Monitor adalah alat debugging paling penting. Gunakan Serial.print untuk melihat nilai sensor, status tombol, hasil perhitungan, dan cabang logika.'),
                            $this->code("void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  Serial.println(\"Arduino aktif\");\n  delay(1000);\n}", 'serial_hello.ino'),
                            $this->warning('Jika output kacau, samakan baud rate di kode dan Serial Monitor, misalnya 9600.'),
                        ],
                    ],
                    [
                        'title' => 'Sensor Suhu DHT11/DHT22',
                        'blocks' => [
                            $this->text('DHT11/DHT22 membaca suhu dan kelembapan. Modul ini membutuhkan library DHT sensor library dan biasanya memakai satu pin data dengan resistor pull-up pada beberapa breakout.'),
                            $this->code("#include <DHT.h>\n\n#define DHTPIN 2\n#define DHTTYPE DHT11\nDHT dht(DHTPIN, DHTTYPE);\n\nvoid setup() {\n  Serial.begin(9600);\n  dht.begin();\n}\n\nvoid loop() {\n  float temperature = dht.readTemperature();\n  float humidity = dht.readHumidity();\n\n  if (isnan(temperature) || isnan(humidity)) {\n    Serial.println(\"Sensor gagal dibaca\");\n    return;\n  }\n\n  Serial.print(\"Suhu: \"); Serial.print(temperature);\n  Serial.print(\" C | RH: \"); Serial.println(humidity);\n  delay(2000);\n}", 'dht_temperature.ino'),
                            $this->note('DHT tidak boleh dibaca terlalu cepat. Gunakan jeda sekitar 2 detik.'),
                        ],
                    ],
                    [
                        'title' => 'Sensor Ultrasonik HC-SR04',
                        'blocks' => [
                            $this->text('HC-SR04 mengukur jarak dengan pulsa trigger dan echo. Arduino mengukur durasi pantulan ultrasonik lalu mengubahnya menjadi jarak.'),
                            $this->code("const int trigPin = 9;\nconst int echoPin = 10;\n\nvoid setup() {\n  pinMode(trigPin, OUTPUT);\n  pinMode(echoPin, INPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(trigPin, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trigPin, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trigPin, LOW);\n\n  long duration = pulseIn(echoPin, HIGH);\n  float distance = duration * 0.0343 / 2;\n  Serial.print(\"Jarak: \"); Serial.println(distance);\n  delay(300);\n}", 'hcsr04_distance.ino'),
                            $this->submission('Buat alat ukur jarak sederhana. Sertakan foto wiring, kode, tabel 5 hasil pengukuran, dan analisis error.'),
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Chapter 7: Aktuator, Display, dan Program Non-Blocking',
                'quiz_title' => 'Aktuator dan Non-Blocking',
                'questions' => [
                    ['question' => 'Mengapa delay() bisa menjadi masalah?', 'answer' => 'delay() menghentikan program sementara sehingga input lain tidak cepat direspons.'],
                    ['question' => 'Apa fungsi library Servo?', 'answer' => 'Menghasilkan sinyal kontrol servo agar dapat bergerak ke sudut tertentu.'],
                ],
                'lessons' => [
                    [
                        'title' => 'Buzzer dan Servo SG90',
                        'blocks' => [
                            $this->text('Buzzer menghasilkan suara untuk alarm. Servo bergerak berdasarkan sudut 0-180 derajat dan cocok untuk palang, gripper kecil, atau indikator mekanik.'),
                            $this->code("#include <Servo.h>\n\nServo servo;\nconst int buzzerPin = 8;\n\nvoid setup() {\n  servo.attach(9);\n  pinMode(buzzerPin, OUTPUT);\n}\n\nvoid loop() {\n  servo.write(0);\n  tone(buzzerPin, 1000, 200);\n  delay(1000);\n  servo.write(90);\n  tone(buzzerPin, 1500, 200);\n  delay(1000);\n}", 'servo_buzzer.ino'),
                            $this->warning('Servo sebaiknya memakai catu daya eksternal jika beban berat. Tetap hubungkan GND eksternal dengan GND Arduino.'),
                        ],
                    ],
                    [
                        'title' => 'LCD I2C untuk Menampilkan Data',
                        'blocks' => [
                            $this->text('LCD I2C mengurangi jumlah kabel menjadi VCC, GND, SDA, dan SCL. Pada Arduino Uno, SDA ada di A4 dan SCL ada di A5.'),
                            $this->code("#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\nvoid setup() {\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print(\"RoboAcademy\");\n}\n\nvoid loop() {\n  lcd.setCursor(0, 1);\n  lcd.print(\"Millis: \");\n  lcd.print(millis() / 1000);\n}", 'lcd_i2c_basic.ino'),
                            $this->note('Alamat I2C umum adalah 0x27 atau 0x3F. Jika LCD kosong, jalankan I2C scanner.'),
                        ],
                    ],
                    [
                        'title' => 'Mengganti delay() dengan millis()',
                        'blocks' => [
                            $this->text('millis() memungkinkan program mengatur waktu tanpa berhenti. Ini penting saat alat perlu membaca tombol, sensor, dan mengendalikan output secara bersamaan.'),
                            $this->code("const int ledPin = 13;\nunsigned long previousMillis = 0;\nconst long interval = 500;\nbool ledState = LOW;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  unsigned long now = millis();\n  if (now - previousMillis >= interval) {\n    previousMillis = now;\n    ledState = !ledState;\n    digitalWrite(ledPin, ledState);\n  }\n}", 'blink_without_delay.ino'),
                            $this->submission('Refactor salah satu proyek sebelumnya agar tidak memakai delay() untuk loop utama. Jelaskan manfaatnya pada laporan singkat.'),
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Chapter 8: Debugging, Dokumentasi, dan Final Project',
                'quiz_title' => 'Final Project Preparation',
                'questions' => [
                    ['question' => 'Apa manfaat membuat sketch minimal saat debugging?', 'answer' => 'Memisahkan masalah agar sensor/komponen dapat diuji satu per satu.'],
                    ['question' => 'Apa saja isi laporan final project?', 'answer' => 'Tujuan, alat, wiring, kode, hasil uji, masalah, solusi, dan dokumentasi foto/video.'],
                ],
                'lessons' => [
                    [
                        'title' => 'Strategi Debugging Hardware dan Software',
                        'blocks' => [
                            $this->text('Debugging yang baik dimulai dari menyederhanakan masalah. Uji power, wiring, sketch minimal, Serial output, lalu gabungkan modul satu per satu.'),
                            $this->checklist(['Ukur tegangan VCC-GND', 'Pastikan pin sesuai kode', 'Uji sensor dengan contoh library', 'Tambahkan Serial.print pada titik penting', 'Catat perubahan yang dicoba']),
                            $this->warning('Jangan mengganti banyak hal sekaligus. Perubahan paralel membuat akar masalah sulit ditemukan.'),
                        ],
                    ],
                    [
                        'title' => 'Dokumentasi Wiring, Kode, dan Video Demo',
                        'blocks' => [
                            $this->text('Dokumentasi membuat proyek mudah direview. Foto wiring harus terang, kode diberi komentar, dan video demo harus menunjukkan input, proses, dan output.'),
                            $this->checklist(['Foto tampak atas wiring', 'Screenshot Serial Monitor jika relevan', 'Kode final dengan komentar', 'Video 30-90 detik', 'Catatan masalah dan solusi']),
                            $this->note('Dokumentasi yang rapi sering lebih penting daripada fitur tambahan yang tidak stabil.'),
                        ],
                    ],
                    [
                        'title' => 'Final Project: Monitoring Suhu dan Cahaya dengan Alarm',
                        'blocks' => [
                            $this->text('Final project menggabungkan sensor DHT, LDR, LED/buzzer, Serial Monitor atau LCD. Sistem membaca suhu dan cahaya, menampilkan data, dan menyalakan alarm jika melewati threshold.'),
                            $this->code("// Final project skeleton\nconst int ldrPin = A0;\nconst int alarmPin = 8;\nint lightThreshold = 450;\nfloat tempThreshold = 32.0;\n\nvoid setup() {\n  pinMode(alarmPin, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int light = analogRead(ldrPin);\n  float temperature = 30.5; // ganti dengan pembacaan DHT\n  bool alarm = light < lightThreshold || temperature > tempThreshold;\n\n  digitalWrite(alarmPin, alarm ? HIGH : LOW);\n  Serial.print(\"Light: \"); Serial.print(light);\n  Serial.print(\" | Temp: \"); Serial.print(temperature);\n  Serial.print(\" | Alarm: \"); Serial.println(alarm ? \"ON\" : \"OFF\");\n  delay(1000);\n}", 'final_project_monitoring.ino'),
                            $this->submission('Kirim final project lengkap: kode final, laporan PDF, foto wiring, tabel hasil uji minimal 5 kondisi, dan link video demo.'),
                        ],
                    ],
                ],
            ],
        ];
    }

    private function text(string $content): array
    {
        return ['type' => 'text', 'content' => $content, 'metadata' => ['source' => 'arduino_basics_seeder']];
    }

    private function code(string $content, string $file): array
    {
        return ['type' => 'code', 'content' => $content, 'metadata' => ['language' => 'cpp', 'file' => $file]];
    }

    private function note(string $content): array
    {
        return ['type' => 'note', 'content' => $content, 'metadata' => ['source' => 'arduino_basics_seeder']];
    }

    private function warning(string $content): array
    {
        return ['type' => 'warning', 'content' => $content, 'metadata' => ['source' => 'arduino_basics_seeder']];
    }

    private function checklist(array $items): array
    {
        return ['type' => 'checklist', 'content' => implode("\n", array_map(fn (string $item) => '- '.$item, $items)), 'metadata' => ['items' => $items]];
    }

    private function submission(string $content): array
    {
        return [
            'type' => 'submission',
            'content' => $content,
            'metadata' => ['allowed' => ['code', 'report', 'image', 'video_url']],
        ];
    }
}
