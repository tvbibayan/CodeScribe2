/**
 * Canvas Trail Effect - Light Theme
 * Subtle background animation optimized for Poulos-inspired design
 */
(function() {
  let ctx, f, e = 0, pos = {}, lines = [];
  
  const E = {
    debug: false,
    friction: 0.5,
    trails: 35,        // Fewer trails for cleaner look
    size: 35,
    dampening: 0.025,
    tension: 0.99,
  };

  function Oscillator(config) {
    this.phase = config.phase || 0;
    this.offset = config.offset || 0;
    this.frequency = config.frequency || 0.001;
    this.amplitude = config.amplitude || 1;
  }

  Oscillator.prototype.update = function() {
    this.phase += this.frequency;
    e = this.offset + Math.sin(this.phase) * this.amplitude;
    return e;
  };

  function Node() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
  }

  function Line(config) {
    this.spring = config.spring + 0.1 * Math.random() - 0.05;
    this.friction = E.friction + 0.01 * Math.random() - 0.005;
    this.nodes = [];
    for (let i = 0; i < E.size; i++) {
      const node = new Node();
      node.x = pos.x || 0;
      node.y = pos.y || 0;
      this.nodes.push(node);
    }
  }

  Line.prototype.update = function() {
    let spring = this.spring;
    let node = this.nodes[0];
    node.vx += (pos.x - node.x) * spring;
    node.vy += (pos.y - node.y) * spring;

    for (let i = 0; i < this.nodes.length; i++) {
      node = this.nodes[i];
      if (i > 0) {
        const prev = this.nodes[i - 1];
        node.vx += (prev.x - node.x) * spring;
        node.vy += (prev.y - node.y) * spring;
        node.vx += prev.vx * E.dampening;
        node.vy += prev.vy * E.dampening;
      }
      node.vx *= this.friction;
      node.vy *= this.friction;
      node.x += node.vx;
      node.y += node.vy;
      spring *= E.tension;
    }
  };

  Line.prototype.draw = function() {
    let x = this.nodes[0].x;
    let y = this.nodes[0].y;

    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let i = 1; i < this.nodes.length - 2; i++) {
      const curr = this.nodes[i];
      const next = this.nodes[i + 1];
      x = 0.5 * (curr.x + next.x);
      y = 0.5 * (curr.y + next.y);
      ctx.quadraticCurveTo(curr.x, curr.y, x, y);
    }

    const secondLast = this.nodes[this.nodes.length - 2];
    const last = this.nodes[this.nodes.length - 1];
    ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
    ctx.stroke();
    ctx.closePath();
  };

  function initLines() {
    lines = [];
    for (let i = 0; i < E.trails; i++) {
      lines.push(new Line({ spring: 0.45 + (i / E.trails) * 0.025 }));
    }
  }

  function handleMove(event) {
    if (event.touches) {
      pos.x = event.touches[0].pageX;
      pos.y = event.touches[0].pageY;
    } else {
      pos.x = event.clientX;
      pos.y = event.clientY;
    }
  }

  function onFirstInteraction(event) {
    document.removeEventListener('mousemove', onFirstInteraction);
    document.removeEventListener('touchstart', onFirstInteraction);
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        pos.x = e.touches[0].pageX;
        pos.y = e.touches[0].pageY;
      }
    });

    handleMove(event);
    initLines();
    render();
  }

  function render() {
    if (!ctx || !ctx.running) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = 'multiply';
    
    // Subtle warm orange/coral tones matching the accent color
    const hue = Math.round(f.update());
    ctx.strokeStyle = 'hsla(' + hue + ',60%,70%,0.04)';
    ctx.lineWidth = 6;

    for (let i = 0; i < E.trails; i++) {
      lines[i].update();
      lines[i].draw();
    }

    ctx.frame++;
    window.requestAnimationFrame(render);
  }

  function resizeCanvas() {
    if (!ctx || !ctx.canvas) return;
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
  }

  window.CanvasEffect = {
    init: function() {
      const canvas = document.getElementById('canvas-effect');
      if (!canvas) {
        console.warn('Canvas element #canvas-effect not found');
        return;
      }

      ctx = canvas.getContext('2d');
      ctx.running = true;
      ctx.frame = 1;

      f = new Oscillator({
        phase: Math.random() * 2 * Math.PI,
        amplitude: 30,        // Subtle variation
        frequency: 0.0008,    // Slow, gentle change
        offset: 25,           // Orange/coral hue range (15-55)
      });

      pos.x = window.innerWidth / 2;
      pos.y = window.innerHeight / 2;

      document.addEventListener('mousemove', onFirstInteraction);
      document.addEventListener('touchstart', onFirstInteraction);
      window.addEventListener('resize', resizeCanvas);
      
      window.addEventListener('focus', function() {
        if (!ctx.running) {
          ctx.running = true;
          render();
        }
      });

      window.addEventListener('blur', function() {
        ctx.running = false;
      });

      resizeCanvas();
    },

    stop: function() {
      if (ctx) ctx.running = false;
    },

    start: function() {
      if (ctx) {
        ctx.running = true;
        render();
      }
    }
  };
})();
