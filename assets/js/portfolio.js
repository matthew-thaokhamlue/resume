/*
	Portfolio functionality for hash-based routing and modal management
	Works with the Dimension template's existing article system
*/

(function ($) {
  var $window = $(window),
    $body = $("body"),
    $main = $("#main"),
    $header = $("#header"),
    $footer = $("#footer"),
    $articles = $main.children("article");

  // Smooth article transitions with animation delays (similar to main.js)
  var delay = 325,
      locked = false;



  function showArticle(id) {
    var $article = $articles.filter("#" + id);
    
    if ($article.length == 0) return;

    // Handle lock to prevent rapid clicking
    if (locked) {
      // Speed through without delays if locked
      $body.addClass('is-switching');
      $body.addClass("is-article-visible");
      $articles.removeClass("active");
      $header.hide();
      $footer.hide();
      $main.show();
      $article.show();
      $article.addClass("active");
      locked = false;
      setTimeout(function() {
        $body.removeClass('is-switching');
      }, 100);
      return;
    }

    locked = true;

    // Article already visible? Reset modal state and show fresh (like index.html)
    if ($body.hasClass('is-article-visible')) {
      var $currentArticle = $articles.filter('.active');
      
      // Step 1: Fade out current article and reset modal state
      $currentArticle.removeClass('active');
      
      setTimeout(function() {
        // Hide current article and reset background
        $currentArticle.hide();
        $body.removeClass('is-article-visible');
        
        // Step 2: Brief pause to let background return to normal
        setTimeout(function() {
          
          // Step 3: Fresh modal opening (like first-time show)
          $body.addClass('is-article-visible');
          
          setTimeout(function() {
            $main.show();
            $article.show();
            
            setTimeout(function() {
              $article.addClass('active');
              $window.scrollTop(0).triggerHandler('resize.flexbox-fix');
              
              setTimeout(function() {
                locked = false;
              }, delay);
            }, 25);
          }, delay);
          
        }, 50); // Brief pause for background reset
      }, delay);
    } 
    // First article show - create the modal overlay effect
    else {
      // Mark as visible (triggers background blur/scale animations)
      $body.addClass("is-article-visible");
      
      setTimeout(function() {
        // Hide header/footer (even though they're commented out, this ensures consistency)
        $header.hide();
        $footer.hide();
        
        // Show main container and the specific article
        $main.show();
        $article.show();
        
        setTimeout(function() {
          // Activate article (triggers slide-up and fade-in animation)
          $article.addClass("active");
          
          // Window management
          $window.scrollTop(0).triggerHandler('resize.flexbox-fix');
          
          setTimeout(function() {
            locked = false;
          }, delay);
        }, 25);
      }, delay);
    }
  }

  // Handle hash changes for direct linking
  function handleHashChange() {
    var hash = window.location.hash;
    var target = "portfolio-grid"; // always default to portfolio-grid

    // Only change target if hash exists, has content, and matches a work detail article
    if (hash && hash.length > 1) {
      var hashTarget = hash.substring(1);
      var $article = $articles.filter("#" + hashTarget);

      // Only use the hash target if it's a valid work detail article (work1, work2, work3)
      if (
        $article.length > 0 &&
        hashTarget !== "portfolio-grid" &&
        hashTarget.startsWith("work")
      ) {
        target = hashTarget;
      }
    }

    // Always show portfolio-grid for base URLs, only show work details for specific work hashes
    showArticle(target);
  }

  // Initialize portfolio functionality
  function initPortfolio() {
    // Unbind main.js keyup handler to prevent conflicts
    $(window).off("keyup");

    // Handle navigation clicks
    $('nav a[href^="#"]').on("click", function (e) {
      var href = $(this).attr("href");
      var target = href.substring(1);
      var $article = $articles.filter("#" + target);

      if ($article.length > 0) {
        e.preventDefault();
        window.location.hash = href;
        showArticle(target);
      }
    });

    // Handle work card clicks
    $(".work-card").on("click", function (e) {
      if (!$(e.target).hasClass("button")) {
        var workId = $(this).data("work");
        if (workId) {
          window.location.hash = "#" + workId;
          showArticle(workId);
        }
      }
    });

    // Handle work card button clicks
    $(".work-card .button").on("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var href = $(this).attr("href");
      var target = href.substring(1);
      var $article = $articles.filter("#" + target);

      if ($article.length > 0) {
        window.location.hash = href;
        showArticle(target);
      }
    });

    // Handle close button functionality
    $articles.each(function () {
      var $article = $(this);

      // Add close functionality with smooth animations
      $('<div class="close">Close</div>')
        .appendTo($article)
        .on("click", function () {
          // If closing portfolio-grid, redirect to main site
          if ($article.attr("id") === "portfolio-grid") {
            window.location.href = "index.html";
          } else {
            // For work detail articles, return to portfolio grid with animation
            window.location.hash = "#portfolio-grid";
            showArticle("portfolio-grid");
          }
        });
    });

    // Handle browser back/forward
    $(window).on("hashchange", handleHashChange);

    // Handle body clicks for closing articles (like main.js)
    $body.on('click.portfolio', function() {
      // Article visible? Check if we should close it
      if ($body.hasClass('is-article-visible')) {
        var $activeArticle = $articles.filter(".active");
        if ($activeArticle.attr("id") === "portfolio-grid") {
          // Don't close portfolio-grid on body click
          return;
        } else {
          // For work detail articles, return to portfolio grid
          window.location.hash = "#portfolio-grid";
          showArticle("portfolio-grid");
        }
      }
    });

    // Prevent clicks from inside articles from bubbling (like main.js)
    $articles.on('click', function(event) {
      event.stopPropagation();
    });

    // Handle escape key - prevent main.js from interfering
    $(window).on("keydown.portfolio", function (e) {
      if (e.keyCode === 27) {
        // Prevent default behavior and stop propagation to avoid main.js interference
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Escape key - check which article is currently active
        var $activeArticle = $articles.filter(".active");
        if ($activeArticle.attr("id") === "portfolio-grid") {
          // If portfolio grid is active, redirect to main site
          window.location.href = "index.html";
        } else {
          // For work detail articles, return to portfolio grid
          window.location.hash = "#portfolio-grid";
          showArticle("portfolio-grid");
        }
      }
    });
  }

  // Initialize articles properly for animations
  function initializeArticles() {
    // Hide all articles initially (like main.js does)
    $articles.hide();
    
    // Ensure articles have proper initial state for animations
    $articles.each(function() {
      var $article = $(this);
      $article.removeClass('active');
    });
  }

  // Initialize when page loads
  $window.on("load", function () {
    // Initialize articles first
    initializeArticles();
    
    // Wait for the template's preload to finish
    setTimeout(function () {
      initPortfolio();
      handleHashChange(); // Show appropriate article based on hash
    }, 200);
  });
})(jQuery);
