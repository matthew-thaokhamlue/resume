# Scroll Stack Layout Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the two layout issues introduced by the stacking scroll panels: hero cards overflowing the viewport on `index.html`, and experience content being obscured by early certifications overlap on `experience.html`.

**Architecture:** Two independent file edits. `experience.html` — un-stick the experience wrapper, promote certifications to a stack-panel. `index.html` — replace the hero bento grid with a compact 2-row asymmetric layout that fits within `h-screen`.

**Tech Stack:** Static HTML + Tailwind CSS CDN + inline `<style>` + vanilla JS. CRLF line endings on `index.html` (use Python `open(path,'rb')` for replacements). LF on `experience.html` (Edit tool works).

---

## Task 1: Fix `experience.html` — un-stick experience, promote certifications

**Files:**
- Modify: `experience.html` (LF line endings — Edit tool works)

### Step 1: Add stack-panel CSS to `<style>` block

Find the closing `</style>` tag (line ~117). Replace:

```
        .card-hover:hover {
            transform: translateY(-4px);
            background-color: rgba(255, 255, 255, 0.08);
        }
    </style>
```

With:

```
        .card-hover:hover {
            transform: translateY(-4px);
            background-color: rgba(255, 255, 255, 0.08);
        }

        /* ── Geist-style stacking scroll panels ── */
        .stack-panel {
            position: sticky;
            top: 0;
            z-index: var(--panel-z, 10);
            background: #101c22;
            transform-origin: top center;
            transition: scale 0.55s cubic-bezier(0.4,0,0.2,1),
                        filter 0.55s cubic-bezier(0.4,0,0.2,1),
                        border-radius 0.55s cubic-bezier(0.4,0,0.2,1);
            will-change: scale, filter;
        }
        .stack-panel + .stack-panel {
            border-radius: 1.5rem 1.5rem 0 0;
            box-shadow: 0 -8px 48px rgba(0, 0, 0, 0.55);
        }
        .stack-panel.is-covered {
            scale: 0.965;
            filter: brightness(0.58);
            border-radius: 1.5rem;
        }
    </style>
```

### Step 2: Un-stick the experience wrapper div

Find (line ~169):
```
            <div class="sticky top-0 z-10 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 gap-16 animate-fade-in">
```

Replace with:
```
            <div class="relative z-10 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 gap-16 animate-fade-in">
```

### Step 3: Make certifications a stack-panel

Find (line ~437):
```
            <section id="certifications" class="relative z-20 w-full bg-background-dark px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
```

Replace with:
```
            <section id="certifications" class="stack-panel w-full bg-background-dark px-4 sm:px-6 lg:px-8 py-20 sm:py-24" style="--panel-z:20">
```

### Step 4: Add scroll JS before closing `</script>` tag

Find (line ~750):
```
    <script>
        function toggleMenu() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('translate-x-full');
        }
    </script>
```

Replace with:
```
    <script>
        function toggleMenu() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('translate-x-full');
        }
    </script>
    <script>
        (function () {
            var panels = document.querySelectorAll('.stack-panel');
            if (!panels.length) return;
            function update() {
                var vh = window.innerHeight;
                panels.forEach(function (panel, i) {
                    var next = panels[i + 1];
                    if (!next) return;
                    var nextTop = next.getBoundingClientRect().top;
                    panel.classList.toggle('is-covered', nextTop < vh * 0.88);
                });
            }
            window.addEventListener('scroll', update, { passive: true });
            update();
        })();
    </script>
```

### Step 5: Verify in browser

Open `experience.html`. Scroll through — all job cards and skills should be fully visible. When certifications enters view, it should slide up as a rounded card over the experience content.

### Step 6: Commit

```bash
git add experience.html
git commit -m "fix: un-stick experience section, certifications slides over as card"
```

---

## Task 2: Restructure `index.html` hero into 2-row bento

**Files:**
- Modify: `index.html` (CRLF line endings — use Python `open(path,'rb')` for all replacements)

### Step 1: Replace the entire hero section via Python

The hero section is bounded by `<!-- Hero Section (Bento Grid Style) -->` and ends at the `</section>` immediately before `<!-- Testimonials Section -->`.

Use Python to replace the entire block. The new hero HTML:

```python
NEW_HERO = '''<!-- Hero Section (Bento Grid Style) -->
      <section class="stack-panel w-full h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" style="--panel-z:10">
        <div class="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in py-16 h-full" style="grid-template-rows: 1fr auto;">

          <!-- Row 1 Col 1-2: Main Intro Card -->
          <div class="lg:col-span-2 flex flex-col justify-between gap-4 rounded-2xl bg-surface border border-white/5 p-6 sm:p-8 relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <span class="material-symbols-outlined text-8xl text-primary">rocket_launch</span>
            </div>
            <div class="flex flex-col gap-3">
              <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-white">Matthew <br>Thaokhamlue</h1>
              <p class="text-lg text-primary font-medium tracking-tight">Senior Product Manager</p>
              <p class="text-white/60 max-w-xl leading-relaxed">Crafting high-impact products at the intersection of technology and user-centric design. Specializing in AI/ML, SaaS, and platform development.</p>
            </div>
            <!-- Slim Audio + AI Match strip -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                <span class="material-symbols-outlined text-primary text-sm shrink-0">graphic_eq</span>
                <audio controls class="w-full h-7 opacity-80 hover:opacity-100 transition-opacity"
                  onplay="if(typeof gtag===\'function\'){gtag(\'event\',\'audio_played\',{audio_title:\'role_discussion\',action:\'play\'})}"
                  onpause="if(typeof gtag===\'function\'){gtag(\'event\',\'audio_played\',{audio_title:\'role_discussion\',action:\'pause\'})}">
                  <source src="Podcast about Matthew Thaokhamlue\'s Technical Product Manager role.wav" type="audio/wav" />
                </audio>
              </div>
              <button id="ai-match-trigger" type="button"
                class="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/35 bg-primary/10 hover:bg-primary/20 transition-colors text-left">
                <span class="material-symbols-outlined text-primary text-sm shrink-0">smart_toy</span>
                <span class="text-sm font-semibold text-white">Evaluate role fit</span>
              </button>
            </div>
          </div>

          <!-- Row 1 Col 3: Availability Sidebar -->
          <div class="flex flex-col gap-3 rounded-2xl bg-surface border border-white/5 p-6">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary">location_on</span>
              <div>
                <p class="text-white font-medium text-sm">Berlin, Germany</p>
                <p class="text-white/50 text-xs">Open to opportunities</p>
              </div>
            </div>
            <div class="h-px bg-white/5"></div>
            <a href="https://www.linkedin.com/in/matthewthaokhamlue" target="_blank"
              class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              onclick="if(typeof gtag===\'function\'){gtag(\'event\',\'external_link_clicked\',{destination_platform:\'linkedin\',link_type:\'sidebar\',location:\'hero_sidebar\'})}">
              <i class="fab fa-linkedin text-lg text-primary shrink-0"></i>
              <span class="text-white/70 group-hover:text-white text-sm transition-colors">LinkedIn</span>
              <span class="material-symbols-outlined text-xs text-white/30 ml-auto">open_in_new</span>
            </a>
            <a href="https://github.com/matthew-thaokhamlue" target="_blank"
              class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              onclick="if(typeof gtag===\'function\'){gtag(\'event\',\'external_link_clicked\',{destination_platform:\'github\',link_type:\'sidebar\',location:\'hero_sidebar\'})}">
              <i class="fab fa-github text-lg text-white/60 shrink-0"></i>
              <span class="text-white/70 group-hover:text-white text-sm transition-colors">GitHub</span>
              <span class="material-symbols-outlined text-xs text-white/30 ml-auto">open_in_new</span>
            </a>
            <div class="h-px bg-white/5"></div>
            <a href="Matthew main CV.pdf" target="_blank" rel="noopener noreferrer"
              class="flex items-center justify-center gap-2 mt-auto h-10 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-primary/20"
              onclick="if(typeof gtag===\'function\'){gtag(\'event\',\'resume_downloaded\',{file_name:\'Matthew main CV.pdf\',page_location:\'index\'})}">
              <span class="material-symbols-outlined text-sm">download</span>
              Download CV
            </a>
          </div>

          <!-- Row 2: 3 compact action cards -->
          <a class="group flex items-center justify-between gap-4 rounded-2xl bg-surface border border-white/5 p-5 transition-all duration-300 hover:bg-surface-hover hover:-translate-y-1 hover:border-primary/30"
            href="portfolio.html">
            <div class="flex items-center gap-4">
              <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span class="material-symbols-outlined">grid_view</span>
              </div>
              <div>
                <h3 class="font-bold text-white">Portfolio</h3>
                <p class="text-white/50 text-sm">Explore my work</p>
              </div>
            </div>
            <span class="material-symbols-outlined text-primary transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
          </a>

          <a class="group flex items-center justify-between gap-4 rounded-2xl bg-surface border border-white/5 p-5 transition-all duration-300 hover:bg-surface-hover hover:-translate-y-1 hover:border-primary/30"
            href="experience.html">
            <div class="flex items-center gap-4">
              <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span class="material-symbols-outlined">description</span>
              </div>
              <div>
                <h3 class="font-bold text-white">Experience</h3>
                <p class="text-white/50 text-sm">Skills &amp; certifications</p>
              </div>
            </div>
            <span class="material-symbols-outlined text-primary transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
          </a>

          <a class="group flex items-center justify-between gap-4 rounded-2xl bg-primary/10 border border-primary/20 p-5 transition-all duration-300 hover:bg-primary/20 hover:-translate-y-1"
            href="https://www.linkedin.com/in/matthewthaokhamlue" target="_blank"
            onclick="if(typeof gtag===\'function\'){gtag(\'event\',\'external_link_clicked\',{destination_platform:\'linkedin\',link_type:\'cta_button\',location:\'hero_section\'})}">
            <div class="flex items-center gap-4">
              <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span class="material-symbols-outlined">person_add</span>
              </div>
              <div>
                <h3 class="font-bold text-white">Let\'s Connect</h3>
                <p class="text-white/50 text-sm">Get in touch</p>
              </div>
            </div>
            <span class="material-symbols-outlined text-primary transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
          </a>

        </div>
      </section>'''
```

Run the replacement via Python:

```python
with open('index.html', 'rb') as f:
    raw = f.read()
html = raw.decode('utf-8')

# Find old hero block
start_marker = '<!-- Hero Section (Bento Grid Style) -->'
end_marker = '\r\n\r\n      <!-- Testimonials Section -->'

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)
assert start_idx != -1 and end_idx != -1

# Find the </section> that closes the hero (just before end_marker)
close_tag = '</section>'
close_idx = html.rfind(close_tag, start_idx, end_idx)
assert close_idx != -1
end_of_hero = close_idx + len(close_tag)

html = html[:start_idx] + NEW_HERO + html[end_of_hero:]

out = html.replace('\r\n', '\n').replace('\n', '\r\n')
with open('index.html', 'wb') as f:
    f.write(out.encode('utf-8'))
```

### Step 2: Verify in browser

Open `index.html`. Check:
- All hero content visible without scrolling on a standard 1280×800 desktop viewport
- Row 1: intro card (left 2/3) + sidebar card (right 1/3)
- Row 2: Portfolio / Experience / Let's Connect action cards
- Audio player and AI match button visible in the slim strip
- No overflow or clipping

Mobile check: on a narrow viewport the grid should collapse to single column cleanly.

### Step 3: Commit

```bash
git add index.html
git commit -m "fix: restructure hero bento into 2-row layout to fit viewport"
```

---

## Task 3: Final verification pass

Open both pages side by side:

1. `index.html` — hero fits in viewport, scroll → testimonials slides over → my story slides over
2. `experience.html` — scroll through all jobs + skills freely, certifications slides up as a card at the end

If anything overflows on mobile (viewport < 768px), reduce `text-4xl` to `text-3xl` on the hero heading and `p-6` to `p-4` on the intro card.

### Commit (if any tweaks made)

```bash
git add index.html experience.html
git commit -m "fix: mobile tweaks for hero and experience stack panels"
```
