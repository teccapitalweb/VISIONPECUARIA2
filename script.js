
const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');
if (menuToggle) menuToggle.addEventListener('click', ()=> menu.classList.toggle('open'));
document.querySelectorAll('.menu a').forEach(a=>a.addEventListener('click', ()=>menu.classList.remove('open')));

const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

let countsStarted = false;
const statsSection = document.querySelector('#impacto');
const countEls = document.querySelectorAll('.count');
const countObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !countsStarted) {
      countsStarted = true;
      countEls.forEach(el => animateCount(el, parseInt(el.dataset.target,10)));
      countObserver.disconnect();
    }
  });
}, { threshold: .3 });
if (statsSection) countObserver.observe(statsSection);
function animateCount(el, target) {
  let n = 0;
  const step = Math.max(1, Math.ceil(target / 80));
  const timer = setInterval(() => {
    n += step;
    if (n >= target) {
      el.textContent = target + '+';
      clearInterval(timer);
    } else {
      el.textContent = n + '+';
    }
  }, 22);
}

const courseData = window.COURSE_DATA || [];
const modal = document.getElementById('courseModal');
const flyerEl = document.getElementById('modalFlyer');
const temarioEl = document.getElementById('modalTemario');
const titleEl = document.getElementById('modalTitle');
const modalWhats = document.getElementById('modalWhats');
function openCourse(id) {
  const course = courseData.find(c => c.id === id);
  if (!course) return;
  flyerEl.src = 'assets/cursos/' + course.flyer;
  temarioEl.src = course.temario ? 'assets/temarios/' + course.temario : 'assets/cursos/' + course.flyer;
  temarioEl.style.display = 'block';
  titleEl.textContent = 'Curso especializado';
  modalWhats.href = 'https://wa.me/522361049715?text=' + encodeURIComponent('Hola, quiero información sobre el curso ' + id + ' de Visión Pecuaria.');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
document.querySelectorAll('[data-course]').forEach(btn => btn.addEventListener('click', () => openCourse(btn.dataset.course)));
document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
