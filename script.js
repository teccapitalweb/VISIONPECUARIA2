
const WHATSAPP_BASE = "https://wa.me/522361049715";

const coursesGrid = document.getElementById('coursesGrid');

function buildWhatsappMessage(courseName){
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(`Hola, quiero información sobre el curso "${courseName}" de Visión Pecuaria.`)}`;
}

// Mapa de etiquetas de área
const areaLabels = {
  bovinos: 'Bovinos',
  porcinos: 'Porcinos',
  equinos: 'Equinos',
  avicultura: 'Avicultura',
  acuicultura: 'Acuicultura',
  apicultura: 'Apicultura',
  general: 'General'
};

function createCourseCard(course){
  const article = document.createElement('article');
  article.className = 'course-card';
  article.dataset.area = course.area || 'general';
  const areaLabel = areaLabels[course.area] || 'General';
  article.innerHTML = `
    <div class="course-image-wrap">
      <img src="${course.imagen}" alt="${course.nombre}" loading="lazy">
    </div>
    <div class="course-body">
      <div class="course-tags">
        <span class="course-tag-area">${areaLabel}</span>
        <span class="course-tag-modalidad">Modalidad online</span>
      </div>
      <h3>${course.nombre}</h3>
      <p class="course-description">${course.descripcion}</p>
      <div class="course-actions">
        <button class="btn-details" data-course-id="${course.id}">Ver detalles</button>
        <a class="btn-informes" href="${buildWhatsappMessage(course.nombre)}" target="_blank" rel="noopener noreferrer">Informes</a>
      </div>
    </div>`;
  return article;
}

// ── CARRUSEL ──────────────────────────────────────────────
let carouselData = [];
let currentIndex = 0;
const CARDS_PER_VIEW_DESKTOP = 3;
const CARDS_PER_VIEW_MOBILE = 1;
const carousel = document.getElementById('coursesCarousel');
const prevBtn = document.getElementById('carouselPrev');
const nextBtn = document.getElementById('carouselNext');
const dotsContainer = document.getElementById('carouselDots');

function getCardsPerView(){
  return window.innerWidth <= 640 ? 1 : window.innerWidth <= 900 ? 2 : 3;
}

function getTotalPages(){
  return Math.ceil(carouselData.length / getCardsPerView());
}

function renderDots(){
  if(!dotsContainer) return;
  const pages = getTotalPages();
  const activePage = Math.floor(currentIndex / getCardsPerView());
  dotsContainer.innerHTML = '';

  // Móvil: ventana de 5 dots; desktop: todos
  const isMobile = window.innerWidth <= 640;
  const maxVisible = isMobile ? 5 : pages;
  let start = 0;
  if(isMobile && pages > maxVisible){
    start = Math.max(0, Math.min(activePage - 2, pages - maxVisible));
  }
  const end = Math.min(start + maxVisible, pages);

  for(let i = start; i < end; i++){
    const dot = document.createElement('button');
    const isActive = i === activePage;
    dot.className = 'carousel-dot' + (isActive ? ' active' : '');
    dot.setAttribute('aria-label', 'Página ' + (i+1));
    const page = i;
    dot.addEventListener('click', () => {
      currentIndex = page * getCardsPerView();
      updateCarouselPosition();
    });
    dotsContainer.appendChild(dot);
  }
}

function updateCarouselPosition(){
  const cpv = getCardsPerView();
  const maxIndex = Math.max(0, carouselData.length - cpv);
  if(currentIndex > maxIndex) currentIndex = maxIndex;
  if(currentIndex < 0) currentIndex = 0;
  const card = coursesGrid.querySelector('.course-card');
  if(!card) return;
  const gap = 24;
  const offset = currentIndex * (card.offsetWidth + gap);
  coursesGrid.style.transform = `translateX(-${offset}px)`;
  if(prevBtn) prevBtn.style.opacity = currentIndex === 0 ? '0.35' : '1';
  if(nextBtn) nextBtn.style.opacity = currentIndex >= maxIndex ? '0.35' : '1';
  renderDots();
}

function renderCarousel(){
  if(!coursesGrid) return;
  coursesGrid.style.transform = 'translateX(0)';
  coursesGrid.innerHTML = '';
  carouselData.forEach(course => coursesGrid.appendChild(createCourseCard(course)));
  bindCourseButtons();
  requestAnimationFrame(updateCarouselPosition);
}

function filterAndRender(area){
  carouselData = area === 'todos' ? [...coursesData] : coursesData.filter(c => c.area === area);
  currentIndex = 0;
  renderCarousel();
}

if(prevBtn){
  prevBtn.addEventListener('click', () => {
    currentIndex = Math.max(0, currentIndex - getCardsPerView());
    updateCarouselPosition();
  });
}
if(nextBtn){
  nextBtn.addEventListener('click', () => {
    const cpv = getCardsPerView();
    currentIndex = Math.min(carouselData.length - cpv, currentIndex + cpv);
    updateCarouselPosition();
  });
}

window.addEventListener('resize', () => {
  currentIndex = 0;
  requestAnimationFrame(updateCarouselPosition);
});

// Swipe táctil — detecta dirección antes de actuar
let touchStartX = 0;
let touchStartY = 0;
let swipeDetected = false;

if(carousel){
  carousel.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    swipeDetected = false;
  }, {passive:true});

  carousel.addEventListener('touchmove', e => {
    if(swipeDetected) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX);
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    // Solo bloquear scroll si el gesto es claramente horizontal
    if(dx > dy && dx > 8){
      swipeDetected = true;
      e.preventDefault(); // bloquea scroll vertical mientras desliza horizontal
    }
  }, {passive:false});

  carousel.addEventListener('touchend', e => {
    if(!swipeDetected) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    const cpv = getCardsPerView();
    if(Math.abs(diff) > 40){
      if(diff > 0) currentIndex = Math.min(carouselData.length - cpv, currentIndex + cpv);
      else currentIndex = Math.max(0, currentIndex - cpv);
      updateCarouselPosition();
    }
    swipeDetected = false;
  }, {passive:true});
}

const modal = document.getElementById('courseModal');
const modalTitle = document.getElementById('modalTitle');
const modalLabel = document.getElementById('modalLabel');
const modalDescription = document.getElementById('modalDescription');
const modalTopics = document.getElementById('modalTopics');
const modalImage = document.getElementById('modalImage');
const modalClose = document.getElementById('modalClose');
const modalWhatsappBtn = document.getElementById('modalWhatsappBtn');

function openModal(course){
  modalTitle.textContent = course.nombre;
  modalLabel.textContent = course.modalidad;
  modalDescription.textContent = course.descripcion;
  modalImage.src = course.imagen;
  modalImage.alt = course.nombre;
  modalTopics.innerHTML = course.temario.map(topic => `<li>${topic}</li>`).join('');
  if(modalWhatsappBtn){
    modalWhatsappBtn.href = buildWhatsappMessage(course.nombre);
  }
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(){
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function bindCourseButtons(){
  document.querySelectorAll('[data-course-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-course-id'));
      const course = coursesData.find(item => item.id === id);
      if(course) openModal(course);
    });
  });
}

if(modalClose){
  modalClose.addEventListener('click', closeModal);
}
document.querySelectorAll('[data-close-modal]').forEach(el => {
  el.addEventListener('click', closeModal);
});
document.addEventListener('keydown', (event) => {
  if(event.key === 'Escape' && modal.classList.contains('is-open')){
    closeModal();
  }
});

const counters = document.querySelectorAll('.counter');
const counterObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if(!entry.isIntersecting) return;
    const counter = entry.target;
    const target = Number(counter.dataset.target || 0);
    const duration = 1600;
    const start = performance.now();

    function animate(time){
      const progress = Math.min((time - start) / duration, 1);
      const value = Math.floor(progress * target);
      counter.textContent = value.toLocaleString('es-MX');
      if(progress < 1){
        requestAnimationFrame(animate);
      } else {
        counter.textContent = target.toLocaleString('es-MX');
      }
    }
    requestAnimationFrame(animate);
    observer.unobserve(counter);
  });
}, {threshold:0.55});
counters.forEach(counter => counterObserver.observe(counter));





const menuToggle = document.getElementById('menuToggle');
const mainMenu = document.getElementById('mainMenu');
if(menuToggle && mainMenu){
  menuToggle.addEventListener('click', () => {
    const open = mainMenu.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  mainMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mainMenu.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

filterAndRender('todos');
bindAreaFilters();





const studentGrid = document.getElementById('studentGrid');
const studentsPrev = document.querySelector('.students-prev');
const studentsNext = document.querySelector('.students-next');

if (studentGrid) {
  const originals = Array.from(studentGrid.children);
  originals.forEach((img) => {
    const clone = img.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    studentGrid.appendChild(clone);
  });

  let autoTimer = null;
  let pauseUntil = 0;
  let isDragging = false;
  let startX = 0;
  let startScroll = 0;

  function getCardWidth() {
    const first = studentGrid.querySelector('img');
    if (!first) return 0;
    return first.getBoundingClientRect().width + 18;
  }

  function resetIfNeeded() {
    const half = studentGrid.scrollWidth / 2;
    if (studentGrid.scrollLeft >= half) {
      studentGrid.scrollLeft -= half;
    } else if (studentGrid.scrollLeft < 0) {
      studentGrid.scrollLeft += half;
    }
  }

  function slide(direction) {
    const step = getCardWidth();
    if (!step) return;
    studentGrid.scrollBy({ left: step * direction, behavior: 'smooth' });
    setTimeout(resetIfNeeded, 450);
  }

  function stopAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => {
      if (Date.now() < pauseUntil || isDragging) return;
      slide(1);
    }, 2600);
  }

  function pauseAuto(ms=4000){
    pauseUntil = Date.now() + ms;
  }

  studentsPrev?.addEventListener('click', () => { pauseAuto(); slide(-1); });
  studentsNext?.addEventListener('click', () => { pauseAuto(); slide(1); });

  studentGrid.addEventListener('pointerdown', (e) => {
    isDragging = true;
    pauseAuto();
    startX = e.clientX;
    startScroll = studentGrid.scrollLeft;
    try { studentGrid.setPointerCapture(e.pointerId); } catch(e){}
  });

  studentGrid.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    studentGrid.scrollLeft = startScroll - delta;
  });

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    resetIfNeeded();
  }

  studentGrid.addEventListener('pointerup', endDrag);
  studentGrid.addEventListener('pointercancel', endDrag);
  studentGrid.addEventListener('mouseleave', endDrag);
  studentGrid.addEventListener('scroll', () => requestAnimationFrame(resetIfNeeded));
  window.addEventListener('resize', startAuto);

  startAuto();
}



function bindAreaFilters(){
  const areaButtons = document.querySelectorAll('.area-btn');
  if(!areaButtons.length) return;
  areaButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      areaButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterAndRender(btn.dataset.area);
    });
  });
}

bindAreaFilters();

// ── CARRUSEL DE RESEÑAS ───────────────────────────────────
(function(){
  const track = document.getElementById('reviewCarousel');
  const grid  = document.getElementById('reviewGrid');
  const prev  = document.getElementById('reviewPrev');
  const next  = document.getElementById('reviewNext');
  const dots  = document.getElementById('reviewDots');
  if(!track || !grid) return;

  const images = Array.from(grid.querySelectorAll('img'));
  let rIdx = 0;

  function rCpv(){
    return window.innerWidth <= 640 ? 1 : window.innerWidth <= 900 ? 2 : 3;
  }

  function rPages(){ return Math.ceil(images.length / rCpv()); }

  function renderReviewDots(){
    if(!dots) return;
    const pg = Math.floor(rIdx / rCpv());
    const total = rPages();
    dots.innerHTML = '';
    const isMobile = window.innerWidth <= 640;
    const maxV = isMobile ? 5 : total;
    const start = isMobile && total > maxV ? Math.max(0, Math.min(pg - 2, total - maxV)) : 0;
    const end = Math.min(start + maxV, total);
    for(let i = start; i < end; i++){
      const d = document.createElement('button');
      d.className = 'carousel-dot' + (i === pg ? ' active' : '');
      d.setAttribute('aria-label', 'Página ' + (i+1));
      const p = i;
      d.addEventListener('click', () => { rIdx = p * rCpv(); updateReview(); });
      dots.appendChild(d);
    }
  }

  function updateReview(){
    const cpv = rCpv();
    const max = Math.max(0, images.length - cpv);
    if(rIdx > max) rIdx = max;
    if(rIdx < 0) rIdx = 0;
    const img = grid.querySelector('img');
    if(!img) return;
    const gap = 20;
    const offset = rIdx * (img.offsetWidth + gap);
    grid.style.transform = `translateX(-${offset}px)`;
    if(prev) prev.style.opacity = rIdx === 0 ? '0.35' : '1';
    if(next) next.style.opacity = rIdx >= max ? '0.35' : '1';
    renderReviewDots();
  }

  if(prev) prev.addEventListener('click', () => { rIdx = Math.max(0, rIdx - rCpv()); updateReview(); });
  if(next) next.addEventListener('click', () => { rIdx = Math.min(images.length - rCpv(), rIdx + rCpv()); updateReview(); });

  // Swipe táctil
  let tx = 0;
  let rTouchX = 0, rTouchY = 0, rSwipe = false;
  track.addEventListener('touchstart', e => {
    rTouchX = e.touches[0].clientX;
    rTouchY = e.touches[0].clientY;
    rSwipe = false;
  }, {passive:true});

  track.addEventListener('touchmove', e => {
    if(rSwipe) return;
    const dx = Math.abs(e.touches[0].clientX - rTouchX);
    const dy = Math.abs(e.touches[0].clientY - rTouchY);
    if(dx > dy && dx > 8){
      rSwipe = true;
      e.preventDefault();
    }
  }, {passive:false});

  track.addEventListener('touchend', e => {
    if(!rSwipe) return;
    const diff = rTouchX - e.changedTouches[0].clientX;
    if(Math.abs(diff) > 40){
      const cpv = rCpv();
      rIdx = diff > 0 ? Math.min(images.length - cpv, rIdx + cpv) : Math.max(0, rIdx - cpv);
      updateReview();
    }
    rSwipe = false;
  }, {passive:true});

  window.addEventListener('resize', () => { rIdx = 0; requestAnimationFrame(updateReview); });
  requestAnimationFrame(updateReview);
})();
