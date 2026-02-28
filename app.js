document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('deckContainer');
  const exportBtn = document.getElementById('exportPdfBtn');
  const nav = document.getElementById('topNav');

  // Compute mobile header safety
  const setNavOffset = () => {
    const navHeight = nav.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--topOffset', `${navHeight}px`);
  };
  setNavOffset();
  window.addEventListener('resize', setNavOffset);

  // Load Content
  try {
    const response = await fetch('content.json');
    const data = await response.json();
    renderDeck(data.slides);
    setupObserver();
    setupKeyboardNav();
  } catch (error) {
    container.innerHTML = `<h2 style="color:white; text-align:center; margin-top:20vh;">Error loading content.json</h2>`;
  }

  // Render Engine
  function renderDeck(slides) {
    slides.forEach((slide) => {
      const el = document.createElement('section');
      el.className = `slide ${slide.type}-slide`;
      
      let html = '';
      if (slide.headline) html += `<h2 data-animate="1">${slide.headline}</h2>`;
      if (slide.subheadline && slide.type === 'title') {
        html = `<h1 data-animate="1">${slide.headline}</h1><p data-animate="2">${slide.subheadline}</p>`;
      } else if (slide.subheadline) {
        html += `<p data-animate="2">${slide.subheadline}</p>`;
      }

      if (slide.bullets && slide.bullets.length) {
        html += `<ul data-animate="3">${slide.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
      }

      if (slide.type === 'beforeAfter') {
        html += `
          <div class="split-grid" data-animate="3">
            <div class="card">
              <h3>${slide.left.title}</h3>
              <ul>${slide.left.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
            </div>
            <div class="card" style="border-color: var(--accent);">
              <h3>${slide.right.title}</h3>
              <ul>${slide.right.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
            </div>
          </div>`;
      }
      
      el.innerHTML = html;
      container.appendChild(el);
    });
  }

  // Intersection Observer for Animations
  function setupObserver() {
    const slides = document.querySelectorAll('.slide');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-active');
        }
      });
    }, { threshold: 0.3 });

    slides.forEach(s => observer.observe(s));
  }

  // Keyboard Navigation
  function setupKeyboardNav() {
    window.addEventListener('keydown', (e) => {
      const scrollAmt = window.innerHeight;
      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'ArrowRight') {
        e.preventDefault();
        container.scrollBy({ top: scrollAmt, behavior: 'smooth' });
      } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
        e.preventDefault();
        container.scrollBy({ top: -scrollAmt, behavior: 'smooth' });
      }
    });
  }

  // --- PDF Export Logic ---
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';
    document.body.classList.add('exportingPdf');

    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
      const slides = document.querySelectorAll('.slide');
      const stage = document.getElementById('pdfStage');

      for (let i = 0; i < slides.length; i++) {
        const slideClone = slides[i].cloneNode(true);
        slideClone.classList.add('is-active'); // Force visible state
        stage.innerHTML = '';
        stage.appendChild(slideClone);

        const canvas = await html2canvas(stage, {
          backgroundColor: '#050611',
          scale: Math.max(window.devicePixelRatio, 2),
          useCORS: true,
          width: 1920,
          height: 1080
        });

        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage([1920, 1080], 'landscape');
        pdf.addImage(imgData, 'PNG', 0, 0, 1920, 1080);
      }

      pdf.save('FlowPitch.pdf');

    } catch (err) {
      alert('Failed to load export libraries. Ensure cdnjs.cloudflare.com is allowed or check your network.');
      console.error(err);
    } finally {
      document.body.classList.remove('exportingPdf');
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export PDF';
      document.getElementById('pdfStage').innerHTML = ''; // Cleanup
    }
  });

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
});