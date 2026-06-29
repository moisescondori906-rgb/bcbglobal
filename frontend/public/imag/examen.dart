import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lottie/lottie.dart';
import 'dart:io';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _showLottie = true;

  @override
  void initState() {
    super.initState();
    Timer(const Duration(seconds: 3), () {
      setState(() => _showLottie = false);
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const Boton()),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Stack(
          children: [
            SizedBox.expand(
              child: Image.asset(
                'assets/image/fondo_examen.png',
                fit: BoxFit.cover,
              ),
            ),
            if (_showLottie)
              SizedBox.expand(
                child: Center(
                  child: Lottie.asset('assets/animation/Money.json', fit: BoxFit.contain),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class Boton extends StatefulWidget {
  const Boton({super.key});

  @override
  State<Boton> createState() => _BotonState();
}

class _BotonState extends State<Boton> {
  int pagina = 0; final nombre = TextEditingController(), salario = TextEditingController(), antiguedad = TextEditingController(); List<String> historial = []; final picker = ImagePicker(); late VideoPlayerController video; bool _showCalcPressed = false; File? _userImageFile; late final AudioPlayer _audioFondo; late final bool _audioEnabled; bool _vericon = true;

  @override
  void initState() {
    super.initState();
    video = VideoPlayerController.asset('assets/video/video.mp4');
    video.initialize().then((_) {
      setState(() {});
      video.play();
    });
    video.addListener(() => setState(() {}));
    _audioFondo = AudioPlayer();
    _audioEnabled = !Platform.isWindows;
  }

  @override
  void dispose() {
    nombre.dispose();
    salario.dispose();
    antiguedad.dispose();
    video.dispose();
    _audioFondo.dispose();
    super.dispose();
  }

  Future abrirCamara() async {
    final XFile? picked = await picker.pickImage(source: ImageSource.camera);
    if (picked != null) {
      setState(() => _userImageFile = File(picked.path));
    }
  }

  Future abrirGaleria() async {
    final XFile? picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked != null) {
      setState(() => _userImageFile = File(picked.path));
    }
  }

  void calcular() {
    if (nombre.text.isEmpty || salario.text.isEmpty || antiguedad.text.isEmpty) return;

    double sueldo = double.parse(salario.text);
    int anios = int.parse(antiguedad.text);
    double afp = sueldo * 0.10;
    double cns = sueldo * 0.0117;
    double bono = 0;
    if (anios <= 5) {
      bono = sueldo * 0.10;
    } else if (anios <= 10) {
      bono = sueldo * 0.15;
    } else {
      bono = sueldo * 0.25;
    }

    double descuentos = afp + cns;
    double total = (sueldo + bono) - descuentos;

    historial.insert(
      0,
      '''Nombre: ${nombre.text}\n\nSalario: ${sueldo.toStringAsFixed(2)} Bs.\n\nBono: ${bono.toStringAsFixed(2)} Bs.\n\nAFP: ${afp.toStringAsFixed(2)} Bs.\n\nCNS: ${cns.toStringAsFixed(2)} Bs.\n\nTotal: ${total.toStringAsFixed(2)} Bs.''',
    );

    setState(() {});
  }

  Widget paginaActual() {
    if (pagina == 0) return pantallaCalculo();
    if (pagina == 1) return pantallaTutorial();
    return pantallaAutor();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          paginaActual(),
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: 12,
            child: Material(
              color: Colors.transparent,
              child: IconButton(
                iconSize: 36,
                onPressed: () {
                  setState(() {
                    if (_vericon == true) {
                      _vericon = false;
                      if (_audioEnabled) {
                        _audioFondo.setReleaseMode(ReleaseMode.stop);
                        _audioFondo.stop();
                      }
                    } else {
                      _vericon = true;
                      if (_audioEnabled) {
                        _audioFondo.setReleaseMode(ReleaseMode.loop);
                        _audioFondo.play(AssetSource("audio/audio_fondo.mp3"));
                      }
                    }
                  });
                },
                icon: Icon(
                  _vericon == true ? Icons.volume_down : Icons.volume_off,
                  color: _vericon == true ? Colors.amber : Colors.red,
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: pagina,
        onTap: (i) => setState(() => pagina = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Calculo'),
          BottomNavigationBarItem(icon: Icon(Icons.video_library), label: 'Tutorial'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Autor'),
        ],
      ),
    );
  }

  Widget pantallaCalculo() {
    return Scaffold(
      appBar: AppBar(title: const Text('Calculo de Salario')),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xff0099ff), Color(0xff39b7ff), Color(0xffd6f3ff)],
          ),
        ),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          CircleAvatar(
                            radius: 80,
                            backgroundImage: _userImageFile != null
                                ? FileImage(_userImageFile!)
                                : const AssetImage('assets/image/gaton.png') as ImageProvider,
                          ),
                          const SizedBox(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              IconButton(
                                onPressed: abrirCamara,
                                icon: const Icon(
                                  Icons.camera_alt,
                                  color: Colors.purple,
                                  size: 40,
                                ),
                              ),
                              const SizedBox(width: 30),
                              IconButton(
                                onPressed: abrirGaleria,
                                icon: const Icon(
                                  Icons.image,
                                  color: Colors.lime,
                                  size: 40,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(15),
                        child: Column(
                          children: [
                            TextField(
                              controller: nombre,
                              decoration: const InputDecoration(
                                hintText: 'Ingrese su nombre',
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.all(Radius.circular(20)),
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),
                            TextField(
                              controller: salario,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                hintText: 'Ingrese salario',
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.all(Radius.circular(20)),
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),
                            TextField(
                              controller: antiguedad,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                hintText: 'Ingrese años antigüedad',
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.all(Radius.circular(20)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const Divider(thickness: 2),
                Center(
                  child: GestureDetector(
                    onTap: () async {
                      if (antiguedad.text.isEmpty) {
                        final rnd = Random();
                        final years = rnd.nextInt(25) + 6;
                        antiguedad.text = years.toString();
                      }
                      setState(() => _showCalcPressed = true);
                      await Future.delayed(const Duration(milliseconds: 300));
                      calcular();
                      setState(() => _showCalcPressed = false);
                    },
                    child: Image.asset(
                      _showCalcPressed
                          ? 'assets/image/calculadora_dedo.png'
                          : 'assets/image/calculadora.png',
                      height: 100,
                    ),
                  ),
                ),
                const Divider(thickness: 2),
                const Text('DATOS HISTORICOS', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                const Divider(),
                SizedBox(
                  height: 300,
                  child: ListView.builder(
                    itemCount: historial.length,
                    itemBuilder: (context, index) => Card(
                      child: ListTile(
                        title: Text(historial[index]),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget pantallaTutorial() {
    String description = '''SALARIO DE EMPLEADOS
  El AFP es el 10% del salario y La CNS es el 1,17% del salario
  El bono si tiene de 0 a 5 es el 10%, si esta entre 6 y 10 es el 15% del salario
  Sino es el 25% de salario
  Total Ganado: (salario+bono)-(cns+afp)''';

    return Scaffold(
      appBar: AppBar(title: const Text('Video Tutorial')),
      body: Column(
        children: [
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Text(description, style: const TextStyle(fontSize: 16, color: Colors.white),),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Center(
              child: video.value.isInitialized
                  ? Column(
                      children: [
                        Expanded(
                          child: AspectRatio(
                            aspectRatio: video.value.aspectRatio,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                VideoPlayer(video),
                                Align(
                                  alignment: Alignment.center,
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      GestureDetector(
                                        onTap: () {
                                          final pos = video.value.position;
                                          final target = pos - const Duration(seconds: 10);
                                          video.seekTo(target >= Duration.zero ? target : Duration.zero);
                                        },
                                        child: const CircleAvatar(
                                          radius: 28,
                                          backgroundColor: Colors.black45,
                                          child: Icon(Icons.replay_10, size: 32, color: Colors.white),
                                        ),
                                      ),
                                      const SizedBox(width: 24),
                                      GestureDetector(
                                        onTap: () {
                                          setState(() {
                                            if (video.value.isPlaying) {
                                              video.pause();
                                            } else {
                                              video.play();
                                            }
                                          });
                                        },
                                        child: CircleAvatar(
                                          radius: 36,
                                          backgroundColor: Colors.black54,
                                          child: Icon(
                                            video.value.isPlaying
                                                ? Icons.pause
                                                : Icons.play_arrow,
                                            size: 40,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 24),
                                      GestureDetector(
                                        onTap: () {
                                          final pos = video.value.position;
                                          final dur = video.value.duration;
                                          final target = pos + const Duration(seconds: 10);
                                          video.seekTo(target <= dur ? target : dur);
                                        },
                                        child: const CircleAvatar(
                                          radius: 28,
                                          backgroundColor: Colors.black45,
                                          child: Icon(Icons.forward_10, size: 32, color: Colors.white),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                          child: Column(
                            children: [
                              VideoProgressIndicator(
                                video,
                                allowScrubbing: true,
                                colors: VideoProgressColors(
                                  playedColor: Colors.purpleAccent,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _formatDuration(video.value.position),
                                    style: const TextStyle(color: Colors.white),
                                  ),
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: Icon(
                                          video.value.volume > 0
                                              ? Icons.volume_up
                                              : Icons.volume_off,
                                          color: Colors.white,
                                        ),
                                        onPressed: () {
                                          setState(() {
                                            video.setVolume(
                                              video.value.volume > 0 ? 0 : 1,
                                            );
                                          });
                                        },
                                      ),
                                      const SizedBox(width: 8),
                                      Text(_formatDuration(video.value.duration), style: const TextStyle(color: Colors.white)),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  : const CircularProgressIndicator(),
            ),
          ),
        ],
      ),
      backgroundColor: const Color(0xff14111f),
    );
  }

  String _formatDuration(Duration d) {
    String two(int n) => n.toString().padLeft(2, '0');
    final minutes = two(d.inMinutes.remainder(60));
    final seconds = two(d.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  Widget pantallaAutor() {
    return Container(
      color: const Color(0xFFD6E8F5),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 100,
                backgroundColor: Colors.white,
                backgroundImage: _userImageFile != null
                    ? FileImage(_userImageFile!)
                    : const AssetImage('assets/image/gato.png') as ImageProvider,
              ),
              const SizedBox(height: 24),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E2E),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    _buildInfoRow(
                      Icons.badge,
                      "Nombre Completo",
                      "Moises Gonzalo Condori Santalla",
                    ),
                    const Divider(
                      color: Colors.white,
                      indent: 25,
                      endIndent: 25,
                    ),
                    _buildInfoRow(
                      Icons.school,
                      "Carrera",
                      "Sistemas Informaticos",
                    ),
                    const Divider(
                      color: Colors.white,
                      indent: 25,
                      endIndent: 25,
                    ),
                    _buildInfoRow(
                      Icons.book,
                      "Curso",
                      "Segundo Año",
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0, horizontal: 20),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 28),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white70, fontSize: 14)),
                const SizedBox(height: 6),
                Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
