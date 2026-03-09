
const WHATSAPP_BASE = "https://wa.me/522361049715";

const coursesGrid = document.getElementById('coursesGrid');
const toggleCoursesBtn = document.getElementById('toggleCoursesBtn');
const INITIAL_VISIBLE_COURSES = 6;
let showAllCourses = false;

function buildWhatsappMessage(courseName){
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(`Hola, quiero información sobre el curso "${courseName}" de Visión Pecuaria.`)}`;
}

function createCourseCard(course){
  const article = document.createElement('article');
  article.className = 'course-card reveal';
  article.innerHTML = `
    <div class="course-image-wrap">
      <img src="${course.imagen}" alt="${course.nombre}">
    </div>
    <div class="course-body">
      <div class="course-meta">
        <span class="course-pill">${course.modalidad}</span>
        <span class="course-id">Curso ${String(course.id).padStart(2, '0')}</span>
      </div>
      <h3>${course.nombre}</h3>
      <ul class="course-topics">
        ${course.temario.map(topic => `<li>${topic}</li>`).join('')}
      </ul>
      <div class="course-actions">
        <button class="btn btn-secondary full" data-course-id="${course.id}">Ver más</button>
        <a class="btn btn-whatsapp full" href="${buildWhatsappMessage(course.nombre)}" target="_blank" rel="noopener noreferrer">Preguntar por WhatsApp</a>
      </div>
    </div>`;
  return article;
}

function renderCourses(){
  if(!coursesGrid) return;
  coursesGrid.innerHTML = '';
  const data = showAllCourses ? coursesData : coursesData.slice(0, INITIAL_VISIBLE_COURSES);
  data.forEach(course => coursesGrid.appendChild(createCourseCard(course)));
  if(toggleCoursesBtn){
    toggleCoursesBtn.textContent = showAllCourses ? 'Ver menos cursos' : 'Ver todos los cursos';
  }
  bindCourseButtons();
  observeReveal();
}

if(toggleCoursesBtn){
  toggleCoursesBtn.addEventListener('click', () => {
    showAllCourses = !showAllCourses;
    renderCourses();
  });
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

function observeReveal(){
  const revealElements = document.querySelectorAll('.reveal:not(.reveal-bound)');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold:0.15});

  revealElements.forEach(el => {
    el.classList.add('reveal-bound');
    revealObserver.observe(el);
  });
}

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

renderCourses();
observeReveal();




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
