const coursesData = [
  {
    "id": 1,
    "nombre": "Inseminación Artificial en Porcino",
    "imagen": "assets/cursos/curso-01.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Anatomía y fisiología reproductiva porcina",
      "Detección de celo y manejo de hembras",
      "Preparación y técnica de inseminación"
    ],
    "descripcion": "Capacitación orientada al manejo reproductivo porcino con enfoque técnico y práctico.",
    "area": "porcinos"
  },
  {
    "id": 2,
    "nombre": "Manejo Estratégico de Becerros",
    "imagen": "assets/cursos/curso-02.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Manejo del recién nacido y calostrado",
      "Sanidad, prevención y bienestar",
      "Alimentación y desarrollo temprano"
    ],
    "descripcion": "Curso enfocado en las etapas clave del crecimiento del becerro para mejorar salud y desempeño.",
    "area": "bovinos"
  },
  {
    "id": 3,
    "nombre": "Medicina Deportiva Equina",
    "imagen": "assets/cursos/curso-03.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Evaluación clínica del caballo atleta",
      "Prevención de lesiones musculoesqueléticas",
      "Manejo y recuperación deportiva"
    ],
    "descripcion": "Formación para comprender la atención, prevención y acondicionamiento del equino deportivo.",
    "area": "equinos"
  },
  {
    "id": 4,
    "nombre": "Producción de Tilapia",
    "imagen": "assets/cursos/curso-04.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Bases del cultivo de tilapia",
      "Alimentación, crecimiento y manejo",
      "Sanidad y productividad en sistemas acuícolas"
    ],
    "descripcion": "Capacitación enfocada al manejo técnico de la tilapia y a la optimización de la producción.",
    "area": "acuicultura"
  },
  {
    "id": 5,
    "nombre": "Nutrición y Manejo de Ganado Bovino (Sistema Intensivo)",
    "imagen": "assets/cursos/curso-05.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Principios de nutrición bovina",
      "Manejo en sistemas intensivos",
      "Estrategias para mejorar desempeño productivo"
    ],
    "descripcion": "Curso dirigido a fortalecer la toma de decisiones en nutrición y manejo de bovinos intensivos.",
    "area": "bovinos"
  },
  {
    "id": 6,
    "nombre": "Gallinas de Postura",
    "imagen": "assets/cursos/curso-06.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Manejo de aves en producción",
      "Nutrición y bienestar de postura",
      "Estrategias para mejorar rendimiento"
    ],
    "descripcion": "Capacitación para comprender el manejo técnico y productivo de gallinas de postura.",
    "area": "avicultura"
  },
  {
    "id": 7,
    "nombre": "Inseminación Artificial en Bovinos",
    "imagen": "assets/cursos/curso-07.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Fisiología reproductiva bovina",
      "Detección de celo y sincronización",
      "Técnica de inseminación artificial"
    ],
    "descripcion": "Curso práctico y técnico sobre el manejo reproductivo e inseminación en bovinos.",
    "area": "bovinos"
  },
  {
    "id": 8,
    "nombre": "Derecho Agrario",
    "imagen": "assets/cursos/curso-08.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Conceptos fundamentales del derecho agrario",
      "Sujetos, propiedad y régimen de tierras",
      "Marco legal aplicado al sector rural"
    ],
    "descripcion": "Formación para comprender aspectos normativos relevantes en el ámbito agrario.",
    "area": "general"
  },
  {
    "id": 9,
    "nombre": "Manejo Integral de Ovinos y Caprinos",
    "imagen": "assets/cursos/curso-09.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Instalaciones y manejo general",
      "Nutrición, reproducción y sanidad",
      "Estrategias productivas y de bienestar"
    ],
    "descripcion": "Curso enfocado al manejo técnico y productivo de pequeños rumiantes.",
    "area": "general"
  },
  {
    "id": 10,
    "nombre": "Manejo Reproductivo y Sanidad en Bovinos",
    "imagen": "assets/cursos/curso-10.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Bases del manejo reproductivo",
      "Prevención sanitaria en bovinos",
      "Indicadores y seguimiento productivo"
    ],
    "descripcion": "Capacitación orientada a fortalecer la reproducción y la sanidad del hato bovino.",
    "area": "bovinos"
  },
  {
    "id": 11,
    "nombre": "Manejo y Reproducción de Camarón Blanco",
    "imagen": "assets/cursos/curso-11.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Biología y manejo del camarón blanco",
      "Reproducción y desarrollo larvario",
      "Buenas prácticas de producción"
    ],
    "descripcion": "Curso técnico para comprender el manejo y la reproducción del camarón blanco.",
    "area": "acuicultura"
  },
  {
    "id": 12,
    "nombre": "Meliponicultura Práctica y Producción Sostenible",
    "imagen": "assets/cursos/curso-12.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Introducción a la meliponicultura",
      "Manejo de colonias y reproducción",
      "Producción sostenible y aprovechamiento"
    ],
    "descripcion": "Formación para el manejo sustentable de abejas nativas sin aguijón.",
    "area": "apicultura"
  },
  {
    "id": 13,
    "nombre": "Formulación de Dietas para Porcinos",
    "imagen": "assets/cursos/curso-13.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Requerimientos nutricionales por etapa",
      "Ingredientes y balanceo de dietas",
      "Optimización alimenticia en porcinos"
    ],
    "descripcion": "Capacitación enfocada en nutrición porcina y formulación práctica de raciones.",
    "area": "porcinos"
  },
  {
    "id": 14,
    "nombre": "Engorda y Reproducción Porcina",
    "imagen": "assets/cursos/curso-14.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Manejo productivo en engorda",
      "Bases reproductivas y selección",
      "Indicadores de desempeño porcícola"
    ],
    "descripcion": "Curso diseñado para fortalecer conocimientos en reproducción y engorda porcina.",
    "area": "porcinos"
  },
  {
    "id": 15,
    "nombre": "Medicina Clínica de Aves Silvestres y de Exhibición",
    "imagen": "assets/cursos/curso-15.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Evaluación clínica y diagnóstico",
      "Manejo sanitario en aves silvestres",
      "Protocolos y cuidados en exhibición"
    ],
    "descripcion": "Formación clínica aplicada a la atención de aves silvestres y de exhibición.",
    "area": "avicultura"
  },
  {
    "id": 16,
    "nombre": "Producción Sostenible (Jaiba, Ostión y Almeja) en Zonas Costeras",
    "imagen": "assets/cursos/curso-16.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Manejo productivo en zonas costeras",
      "Buenas prácticas y sostenibilidad",
      "Aprovechamiento de especies marinas"
    ],
    "descripcion": "Capacitación orientada a producción costera con visión sostenible.",
    "area": "acuicultura"
  },
  {
    "id": 17,
    "nombre": "Rentabilidad en Producción de Carne",
    "imagen": "assets/cursos/curso-17.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Costos e indicadores productivos",
      "Estrategias para mejorar rentabilidad",
      "Toma de decisiones en producción cárnica"
    ],
    "descripcion": "Curso enfocado a eficiencia económica y productiva en sistemas de carne.",
    "area": "bovinos"
  },
  {
    "id": 18,
    "nombre": "Acuaponia con Peces de Ornato",
    "imagen": "assets/cursos/curso-18.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Principios de acuaponia",
      "Integración de peces y cultivo vegetal",
      "Manejo del sistema y calidad de agua"
    ],
    "descripcion": "Formación práctica para diseñar y manejar sistemas acuapónicos con peces de ornato.",
    "area": "acuicultura"
  },
  {
    "id": 19,
    "nombre": "Manejo Reproductivo en Equinos",
    "imagen": "assets/cursos/curso-19.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Fisiología reproductiva equina",
      "Control del ciclo y diagnóstico",
      "Manejo del semental y la yegua"
    ],
    "descripcion": "Curso enfocado al control reproductivo y a la eficiencia en equinos.",
    "area": "equinos"
  },
  {
    "id": 20,
    "nombre": "Abeja Reina: Manejo Sostenible de Colmenas",
    "imagen": "assets/cursos/curso-21.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Organización y manejo de colmenas",
      "Importancia de la abeja reina",
      "Prácticas sostenibles en apicultura"
    ],
    "descripcion": "Capacitación sobre manejo de colmenas con enfoque sustentable y productivo.",
    "area": "apicultura"
  },
  {
    "id": 21,
    "nombre": "Problemas Metabólicos y Manejo de Desparasitación en Ovinos y Caprinos",
    "imagen": "assets/cursos/curso-23.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Principales trastornos metabólicos",
      "Programas de desparasitación estratégica",
      "Manejo sanitario preventivo"
    ],
    "descripcion": "Curso para fortalecer el diagnóstico y manejo sanitario de ovinos y caprinos.",
    "area": "general"
  },
  {
    "id": 22,
    "nombre": "Peces de Ornato: Cuidado y Manejo",
    "imagen": "assets/cursos/curso-25.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Instalación y mantenimiento del sistema",
      "Calidad de agua y alimentación",
      "Manejo y prevención sanitaria"
    ],
    "descripcion": "Capacitación práctica enfocada en el bienestar y manejo de peces de ornato.",
    "area": "acuicultura"
  },
  {
    "id": 23,
    "nombre": "Estrategias de Genética y Engorda de Alta Rentabilidad “Pelifolk”",
    "imagen": "assets/cursos/curso-29.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Selección genética aplicada",
      "Manejo de engorda eficiente",
      "Estrategias para elevar rentabilidad"
    ],
    "descripcion": "Curso orientado a genética y engorda con visión productiva y rentable.",
    "area": "general"
  },
  {
    "id": 24,
    "nombre": "Mi Primer Caballo: Guía Práctica de Manejo y Cuidados Básicos",
    "imagen": "assets/cursos/curso-31.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Cuidados básicos y bienestar",
      "Manejo diario del caballo",
      "Salud preventiva y buenas prácticas"
    ],
    "descripcion": "Curso introductorio para comprender el manejo responsable y seguro del caballo.",
    "area": "equinos"
  },
  {
    "id": 25,
    "nombre": "Codorniz Rentable",
    "imagen": "assets/cursos/curso-33.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Instalaciones y manejo de codorniz",
      "Producción, alimentación y sanidad",
      "Rentabilidad y aprovechamiento"
    ],
    "descripcion": "Capacitación enfocada al manejo productivo y rentable de la codorniz.",
    "area": "avicultura"
  },
  {
    "id": 26,
    "nombre": "Formulación de Dietas para Gallinas y Pollos",
    "imagen": "assets/cursos/curso-35.jpeg",
    "modalidad": "Capacitación especializada",
    "temario": [
      "Principios de nutrición avícola",
      "Ingredientes y formulación práctica",
      "Ajustes según etapa productiva"
    ],
    "descripcion": "Curso enfocado a nutrición y elaboración de dietas para aves de producción.",
    "area": "avicultura"
  }
];