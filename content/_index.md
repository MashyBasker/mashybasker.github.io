---
title: okabe
unsafe: true
---

# 'Sup

I'm **Maharshi** - software engineer, weeb, and a systems & infosec nerd.

This site is an archive of who I am, what I do and my ideas/explorations in the form of (future) blogs. Currently, I'm into Zig and working on compilers.

If you'd like to know me more, try the [about](/about/) page.

<div class="social-container">
  <a href="https://github.com/MashyBasker" rel="noopener" target="_blank" class="social-link">GitHub</a>
  <a href="/resume.pdf" target="_blank" class="social-link">Resume</a>
  <a href="https://x.com/chisanmei" target="_blank" class="social-link">Twitter</a>
</div>

<style>
  .social-container {
    display: flex;
    justify-content: left;
    align-items: center;
    gap: 30px;
    margin-top: 40px;
  }

  .social-link {
    color: inherit;
    text-decoration: none;
    font-style: italic;
    position: relative;
    padding-bottom: 3px; /* Space for underline */
  }

  .social-link:hover {
    color: #000;
  }

  /* Animated underline */
  .social-link::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px; /* Underline thickness */
    background-color: #000;
    transition: width 0.3s ease-in-out;
  }

  .social-link:hover::after {
    width: 100%;
  }
</style>