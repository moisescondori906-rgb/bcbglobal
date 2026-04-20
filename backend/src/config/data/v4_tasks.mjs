
/**
 * SAV v4.0.0 - SEMILLA DE TAREAS PROFESIONALES
 * 
 * Este archivo contiene la configuración de tareas vinculadas a videos reales
 * en la carpeta /video del proyecto, con descripciones en inglés y lógica
 * de validación coherente.
 */

export const v4_tasks = [
  // --- NIVEL: PASANTE (L1) ---
  {
    nombre: 'Chanel Elegance',
    nivel_codigo: 'pasante',
    recompensa: 1.80,
    video_url: '/video/chanel1.mp4',
    descripcion: 'Discover the world of Chanel, where timeless elegance meets haute couture and sophisticated luxury.',
    pregunta: 'Which luxury brand is showcased in this visual campaign?',
    opciones: ['CHANEL', 'DIOR', 'GUCCI', 'PRADA'],
    respuesta_correcta: 'CHANEL'
  },
  {
    nombre: 'Coca-Cola Refresh',
    nivel_codigo: 'pasante',
    recompensa: 1.80,
    video_url: '/video/cocacola1.mp4',
    descripcion: 'Experience the refreshing taste of happiness with Coca-Cola, bringing people together for over a century.',
    pregunta: 'What is the main beverage brand featured in this advertisement?',
    opciones: ['COCA-COLA', 'PEPSI', 'SPRITE', 'FANTA'],
    respuesta_correcta: 'COCA-COLA'
  },
  {
    nombre: 'Adidas Performance',
    nivel_codigo: 'pasante',
    recompensa: 1.80,
    video_url: '/video/adidas1.mp4',
    descripcion: 'Push your limits with Adidas sportswear, designed for athletes who strive for greatness in every move.',
    pregunta: 'Which sportswear brand is promoting its performance gear?',
    opciones: ['ADIDAS', 'NIKE', 'PUMA', 'REEBOK'],
    respuesta_correcta: 'ADIDAS'
  },
  {
    nombre: 'McDonald\'s Flavor',
    nivel_codigo: 'pasante',
    recompensa: 1.80,
    video_url: '/video/mcdonal1.mp4',
    descripcion: 'Indulge in the iconic flavors of McDonald\'s, where quality meets convenience for a golden experience.',
    pregunta: 'Which fast-food chain is featured in this commercial?',
    opciones: ['MCDONALD\'S', 'BURGER KING', 'KFC', 'SUBWAY'],
    respuesta_correcta: 'MCDONALD\'S'
  },

  // --- NIVEL: Global 1 ---
  {
    nombre: 'Nike Innovation',
    nivel_codigo: 'Global 1',
    recompensa: 1.80,
    video_url: '/video/nike1.mp4',
    descripcion: 'Just Do It. Explore the latest Nike innovations that empower athletes across the globe to reach their peak.',
    pregunta: 'Which brand uses the slogan "Just Do It" in its marketing?',
    opciones: ['NIKE', 'ADIDAS', 'UNDER ARMOUR', 'ASICS'],
    respuesta_correcta: 'NIKE'
  },
  {
    nombre: 'Rolex Precision',
    nivel_codigo: 'Global 1',
    recompensa: 1.80,
    video_url: '/video/rolex1.mp4',
    descripcion: 'A crown for every achievement. Rolex timepieces represent the pinnacle of precision and horological mastery.',
    pregunta: 'Which prestigious watchmaker is represented in this video?',
    opciones: ['ROLEX', 'OMEGA', 'PATEK PHILIPPE', 'TAG HEUER'],
    respuesta_correcta: 'ROLEX'
  },
  {
    nombre: 'Tesla Future',
    nivel_codigo: 'Global 1',
    recompensa: 1.80,
    video_url: '/video/tesla1.mp4',
    descripcion: 'Accelerating the world\'s transition to sustainable energy through cutting-edge electric vehicle technology.',
    pregunta: 'Which electric vehicle pioneer is showcased in this presentation?',
    opciones: ['TESLA', 'BMW', 'AUDI', 'MERCEDES'],
    respuesta_correcta: 'TESLA'
  },
  {
    nombre: 'Puma Velocity',
    nivel_codigo: 'Global 1',
    recompensa: 1.80,
    video_url: '/video/puma1.mp4',
    descripcion: 'Forever Faster. Puma combines sport and lifestyle to create gear that moves as fast as you do.',
    pregunta: 'Which brand is known for the "Forever Faster" campaign?',
    opciones: ['PUMA', 'NIKE', 'ADIDAS', 'NEW BALANCE'],
    respuesta_correcta: 'PUMA'
  },

  // --- NIVEL: Global 2 ---
  {
    nombre: 'Lamborghini Power',
    nivel_codigo: 'Global 2',
    recompensa: 3.22,
    video_url: '/video/lamborghini1.mp4',
    descripcion: 'Italian excellence and extreme performance. Lamborghini supercars redefine the boundaries of speed.',
    pregunta: 'Which Italian supercar brand is featured in this high-speed video?',
    opciones: ['LAMBORGHINI', 'FERRARI', 'PORSCHE', 'MCLAREN'],
    respuesta_correcta: 'LAMBORGHINI'
  },
  {
    nombre: 'Dior Couture',
    nivel_codigo: 'Global 2',
    recompensa: 3.22,
    video_url: '/video/dior1.mp4',
    descripcion: 'Celebrate the art of beauty and fashion with Dior, where every creation is a masterpiece of elegance.',
    pregunta: 'Which renowned brand is showcased in this artistic commercial?',
    opciones: ['DIOR', 'CHANEL', 'YSL', 'GIVENCHY'],
    respuesta_correcta: 'DIOR'
  },
  {
    nombre: 'Gucci Style',
    nivel_codigo: 'Global 2',
    recompensa: 3.22,
    video_url: '/video/gucci1.mp4',
    descripcion: 'Step into the world of Gucci, a symbol of modern luxury and eclectic fashion that defines the industry.',
    pregunta: 'Which fashion house is presenting its latest collection here?',
    opciones: ['GUCCI', 'PRADA', 'VERSACE', 'VALENTINO'],
    respuesta_correcta: 'GUCCI'
  },
  {
    nombre: 'Ferrari Speed',
    nivel_codigo: 'Global 2',
    recompensa: 3.22,
    video_url: '/video/ferrari1.mp4',
    descripcion: 'Feel the thrill of speed with Ferrari, where Italian engineering meets racing passion on every road.',
    pregunta: 'Which automotive icon is featured in this high-performance video?',
    opciones: ['FERRARI', 'LAMBORGHINI', 'PORSCHE', 'MCLAREN'],
    respuesta_correcta: 'FERRARI'
  },

  // --- NIVEL: Global 3 ---
  {
    nombre: 'Mercedes Luxury',
    nivel_codigo: 'Global 3',
    recompensa: 6.76,
    video_url: '/video/mercedes1.mp4',
    descripcion: 'The best or nothing. Mercedes-Benz represents the ultimate in automotive luxury, safety, and innovation.',
    pregunta: 'Which car brand uses the slogan "The best or nothing"?',
    opciones: ['MERCEDES', 'BMW', 'AUDI', 'LEXUS'],
    respuesta_correcta: 'MERCEDES'
  },
  {
    nombre: 'BMW Driving',
    nivel_codigo: 'Global 3',
    recompensa: 6.76,
    video_url: '/video/bmw1.mp4',
    descripcion: 'The ultimate driving machine. Experience the perfect balance of performance and comfort with BMW.',
    pregunta: 'Which brand is known as "The ultimate driving machine"?',
    opciones: ['BMW', 'MERCEDES', 'AUDI', 'PORSCHE'],
    respuesta_correcta: 'BMW'
  },
  {
    nombre: 'Audi Progress',
    nivel_codigo: 'Global 3',
    recompensa: 6.76,
    video_url: '/video/audi1.mp4',
    descripcion: 'Vorsprung durch Technik. Audi leads the way in automotive technology and sleek, modern design.',
    pregunta: 'Which German brand is featured in this technology-focused ad?',
    opciones: ['AUDI', 'VW', 'BMW', 'MERCEDES'],
    respuesta_correcta: 'AUDI'
  },
  {
    nombre: 'Porsche Heritage',
    nivel_codigo: 'Global 3',
    recompensa: 6.76,
    video_url: '/video/porsche1.mp4',
    descripcion: 'There is no substitute. Porsche sportscars are built on a heritage of racing excellence and engineering.',
    pregunta: 'Which sportscar manufacturer is showcased in this video?',
    opciones: ['PORSCHE', 'FERRARI', 'LAMBORGHINI', 'ASTON MARTIN'],
    respuesta_correcta: 'PORSCHE'
  }
];
