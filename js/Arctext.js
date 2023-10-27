(function () {
  function fitText(element, kompressor, options) {
    var settings = {
      minFontSize: Number.NEGATIVE_INFINITY,
      maxFontSize: Number.POSITIVE_INFINITY,
    };

    var $element = document.querySelector(element);
    var compressor = kompressor || 1;

    if (options) {
      Object.assign(settings, options);
    }

    function resizer() {
      $element.style.fontSize = Math.max(
        Math.min($element.offsetWidth / (compressor * 10), parseFloat(settings.maxFontSize)),
        parseFloat(settings.minFontSize)
      ) + "px";
    }

    resizer();
    window.addEventListener("resize", resizer);
  }

  function injector(t, splitter, klass, after) {
    var a = t.textContent.split(splitter);
    var inject = "";
    var emptyclass;
    if (a.length) {
      a.forEach(function (item, i) {
        emptyclass = "";
        if (item === " ") {
          emptyclass = " empty";
          item = "\u00A0";
        }
        inject += '<span class="' + klass + (i + 1) + emptyclass + '">' + item + "</span>" + after;
      });
      t.innerHTML = inject;
    }
  }

  function lettering(element) {
    var $element = element;
    var text = $element.textContent;
    var letters = text.split('');
    $element.innerHTML = letters.map(function (letter) {
      return '<span>' + letter + '</span>';
    }).join('');
  }

  function letteringInit(element) {
    var $element = document.querySelector(element);
    injector($element, "", "char", "");
  }

  function letteringWords(element) {
    var $element = document.querySelector(element);
    injector($element, " ", "word", " ");
  }

  function letteringLines(element) {
    var $element = document.querySelector(element);
    var r = "eefec303079ad17405c889e092e105b0";
    injector($element, r, "line", "");
  }

  function Arctext(element, options) {
    this.el = document.querySelector(element);
    this.init(options);
  }

  Arctext.defaults = {
    radius: 0,
    dir: 1,
    rotate: true,
    fitText: false,
  };

  Arctext.prototype = {
    init: function (options) {
      this.options = Object.assign({}, Arctext.defaults, options);
      this.applyLettering();
      this.el.dataset.arctext = true;
      this.calc();
      this.rotateWord();
      this.loadEvents();
    },

    applyLettering: function () {
      //this.el.textContent = ""; // Clear the content
       this.el.innerHTML = this.el.textContent
      .split('')
      .map((char) => (char === ' ' ? '&nbsp;' : char))
      .map((char, index) => `<span class="char char${index + 1}">${char}</span>`)
      .join('');
   
      if (this.options.fitText) {
        fitText(this.el, 1, {}); // Fit text is applied here, you may customize it
      }
      this.letters = Array.from(this.el.querySelectorAll('span'));
      this.letters.forEach((letter) => (letter.style.display = 'inline-block'));
    },

    calc: function () {
      if (this.options.radius === -1) return false;
      this.calcBase();
      this.calcLetters();
    },

    calcBase: function () {
      this.dtWord = 0;
      var self = this;

      this.letters.forEach(function (letter) {
        var letterWidth = letter.offsetWidth;
        self.dtWord += letterWidth;
        letter.dataset.center = self.dtWord - letterWidth / 2;
      });

      var centerWord = this.dtWord / 2;

      if (this.options.radius < centerWord) {
        this.options.radius = centerWord;
      }

      this.dtArcBase  = this.dtWord;
      var angle = 2 * Math.asin(this.dtArcBase / (2 * this.options.radius));
      this.dtArc = this.options.radius * angle;
    },

    calcLetters: function () {
      var self = this;
      var iteratorX = 0;

      this.letters.forEach(function (letter, i) {
      	var dtArcLetter = (letter.offsetWidth / self.dtWord) * self.dtArc;
        var beta = dtArcLetter / self.options.radius;
        var h = self.options.radius * Math.cos(beta / 2);
        var alpha = Math.acos((self.dtWord / 2 - iteratorX) / self.options.radius);
        var theta = alpha + beta / 2;
        var x = Math.cos(theta) * h;
        var y = Math.sin(theta) * h;
        var xpos = iteratorX + Math.abs(self.dtWord / 2 - x - iteratorX);
        var xval = 0 | xpos - parseFloat(letter.dataset.center);
        var yval = 0 | self.options.radius - y;
        var angle = self.options.rotate
          ? 0 | -Math.asin(x / self.options.radius) * (180 / Math.PI)
          : 0;
        iteratorX = 2 * xpos - iteratorX;
        letter.dataset.x = xval;
        letter.dataset.y = self.options.dir === 1 ? yval : -yval;
        letter.dataset.a = self.options.dir === 1 ? angle : -angle;
      });
    },

    rotateWord: function (animation) {
      if (!this.el.dataset.arctext) return false;
      var self = this;

      this.letters.forEach(function (letter) {
        var transformation =
          self.options.radius === -1
            ? "none"
            : "translate(" +
              letter.dataset.x +
              "px, " +
              letter.dataset.y +
              "px) rotate(" +
              letter.dataset.a +
              "deg)";
        var transition = animation
          ? "all " + (animation.speed || 0) + "ms " + (animation.easing || "linear")
          : "none";

        letter.style.transition =
          "-webkit-transform " + transition + ", " +
          "-moz-transform " + transition + ", " +
          "-o-transform " + transition + ", " +
          "-ms-transform " + transition + ", " +
          "transform " + transition;

        letter.style.transform = transformation;
      });
    },

    loadEvents: function () {
      if (this.options.fitText) {
        var self = this;
        window.addEventListener("resize", function () {
          self.calc();
          self.rotateWord();
        });
      }
    },

    set: function (opts) {
      if (!opts.radius && !opts.dir && opts.rotate === undefined) {
        return false;
      }

      this.options.radius = opts.radius || this.options.radius;
      this.options.dir = opts.dir || this.options.dir;

      if (opts.rotate !== undefined) {
        this.options.rotate = opts.rotate;
      }

      this.calc();
      this.rotateWord(opts.animation);
    },

    destroy: function () {
      this.options.radius = -1;
      this.rotateWord();
      this.letters.forEach(function (letter) {
        delete letter.dataset.x;
        delete letter.dataset.y;
        delete letter.dataset.a;
        delete letter.dataset.center;
      });
      delete this.el.dataset.arctext;
      window.removeEventListener("resize", this.loadEvents);
    },
  };

  function Arctext(element, options) {
    this.el = element;
    this.init(options);
  }


  function logError(message) {
    if (console) {
      console.error(message);
    }
  }

  function arctext(element, options) {
    if (typeof options === "string") {
      var args = Array.prototype.slice.call(arguments, 1);

      if (!element.arctext) {
        logError(
          "Cannot call methods on arctext prior to initialization; " +
            "attempted to call method '" +
            options +
            "'"
        );
        return;
      }

      if (
        typeof element.arctext[options] !== "function" || options.charAt(0) === "_"
      ) {
        logError("No such method '" + options + "' for arctext instance");
        return;
      }

      element.arctext[options].apply(element.arctext, args);
    } else {
      if (!element.arctext) {
        element.arctext = new Arctext(element, options);
      }
    }
  }

  window.arctext = arctext;

  window.arctext = arctext;
})();
