/* Client-only search: no credentials, requests or backend writes. */
(function () {
    'use strict';
    // Fragment keeps the free-text query in the browser, including markup-like
    // search terms; nothing is submitted to ASP.NET or logged as a query string.
    var query = (new URLSearchParams(window.location.hash.slice(1)).get('q') || '').trim().slice(0,120);
    document.querySelectorAll('[data-client-search]').forEach(function (box) {
        var input = box.querySelector('input'), link = box.querySelector('.search-submit');
        if (!input || !link) return;
        input.value = query;
        function destination() {
            var url = new URL(link.href), fragment = new URLSearchParams();
            if (input.value.trim()) fragment.set('q',input.value.trim().slice(0,120));
            url.hash = fragment.toString();
            return url.href;
        }
        link.addEventListener('click',function (event) { event.preventDefault(); window.location.assign(destination()); });
        input.addEventListener('keydown',function (event) { if (event.key==='Enter') {event.preventDefault();window.location.assign(destination());} });
    });
    var results = document.querySelector('[data-search-results]');
    function filter() {
    query = (new URLSearchParams(window.location.hash.slice(1)).get('q') || '').trim().slice(0,120);
    document.querySelectorAll('.site-search-input').forEach(function(input){input.value=query;});
    if (!results) return;
    var terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean), count=0;
    results.querySelectorAll('[data-search-item]').forEach(function (item) {
        var value = (item.dataset.searchText+' '+item.textContent).toLocaleLowerCase();
        item.hidden = !terms.every(function (term) {return value.indexOf(term)>=0;});
        if (!item.hidden) count++;
    });
    results.querySelector('.search-status').textContent = results.dataset.searchLanguage==='en'
        ? (query ? '“'+query+'” — '+count+' results' : count+' entries')
        : (query ? '“'+query+'” · '+count+' 条结果' : '共 '+count+' 条内容');
    }
    window.addEventListener('hashchange',filter);
    filter();
})();

/* Automatic horizontal carousel. Supplied originals remain available without JS. */
(function () {
    'use strict';
    document.querySelectorAll('[data-carousel]').forEach(function (root) {
        var slides=Array.from(root.querySelectorAll('[data-slide]'));
        var dots=Array.from(root.querySelectorAll('[data-slide-to]'));
        var index=0, touchX=null, touchY=null, timer=null, hovered=false, focused=false, pendingSlide=0;
        var track=root.querySelector('.hero-slides'), pause=root.querySelector('[data-slide-pause]');
        var reduced=window.matchMedia('(prefers-reduced-motion: reduce)'), paused=reduced.matches;
        if(slides.length<2||!track||!pause)return;
        var clone=slides[0].cloneNode(true);
        clone.removeAttribute('data-slide');clone.setAttribute('data-slide-clone','');clone.setAttribute('aria-hidden','true');clone.inert=true;track.appendChild(clone);
        function schedule(){
            clearTimeout(timer);
            if(!paused&&!hovered&&!focused&&!document.hidden)timer=setTimeout(function(){show(index+1,false);},4500);
        }
        function updatePause(){pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?pause.dataset.playLabel:pause.dataset.pauseLabel);pause.textContent=paused?'▶':'Ⅱ';}
        function activate(next,announce) {
            var wrap=next===slides.length&&!reduced.matches;
            track.classList.remove('no-transition');
            index=(next+slides.length)%slides.length;
            slides.forEach(function(slide,i){slide.setAttribute('aria-hidden',String(i!==index));slide.inert=i!==index;});
            // One inert duplicate allows the last-to-first advance to continue left.
            track.style.transform='translateX(-'+(wrap?slides.length:index)*100+'%)';
            root.dataset.activeSlide=String(index);
            var nextImage=slides[(index+1)%slides.length].querySelector('img');if(nextImage)nextImage.loading='eager';
            dots.forEach(function(dot,i){dot.setAttribute('aria-pressed',String(i===index));});
            if(announce)root.querySelector('[data-slide-status]').textContent=(index+1)+' / '+slides.length;
            schedule();
        }
        function show(next,announce) {
            var destination=(next+slides.length)%slides.length;
            var image=slides[destination].querySelector('img');
            var request=++pendingSlide;
            if(image)image.loading='eager';
            if(destination!==0&&image&&!image.complete){
                clearTimeout(timer);
                var finish=function(){if(request===pendingSlide)activate(next,announce);};
                image.addEventListener('load',finish,{once:true});
                image.addEventListener('error',finish,{once:true});
                return;
            }
            activate(next,announce);
        }
        track.addEventListener('transitionend',function(e){if(e.target!==track||e.propertyName!=='transform')return;if(index===0){track.classList.add('no-transition');track.style.transform='translateX(0)';}});
        pause.addEventListener('click',function(){paused=!paused;updatePause();schedule();});
        root.addEventListener('mouseenter',function(){hovered=true;schedule();});
        root.addEventListener('mouseleave',function(){hovered=false;schedule();});
        root.addEventListener('focusin',function(){focused=true;schedule();});
        root.addEventListener('focusout',function(){setTimeout(function(){focused=root.contains(document.activeElement);schedule();},0);});
        document.addEventListener('visibilitychange',schedule);
        function motionChange(){paused=reduced.matches;updatePause();schedule();}
        if(reduced.addEventListener)reduced.addEventListener('change',motionChange);else reduced.addListener(motionChange);
        root.querySelector('[data-slide-prev]').addEventListener('click',function(){show(index-1,true);});
        root.querySelector('[data-slide-next]').addEventListener('click',function(){show(index+1,true);});
        dots.forEach(function(dot,i){dot.addEventListener('click',function(){show(i,true);});});
        root.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1),true);}});
        root.addEventListener('touchstart',function(e){if(e.touches.length===1){touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;}},{passive:true});
        root.addEventListener('touchend',function(e){if(touchX===null)return;var dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;touchX=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)show(index+(dx<0?1:-1),true);},{passive:true});
        root.classList.add('carousel-ready');updatePause();show(0,false);
    });
})();

/* Small progressive enhancement; the navigation remains usable without JS. */
(function () {
    'use strict';
    var button = document.querySelector('.menu-toggle');
    var nav = document.getElementById('primary-navigation');
    if (!button || !nav) return;
    var narrow = window.matchMedia('(max-width: 1050px)');
    document.documentElement.classList.add('navigation-ready');
    function toggle(open, restoreFocus) {
        button.setAttribute('aria-expanded', String(open));
        nav.classList.toggle('is-open', open);
        if (restoreFocus) button.focus();
    }
    button.addEventListener('click', function () { toggle(button.getAttribute('aria-expanded') !== 'true', false); });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') toggle(false, true);
    });
    function reset() { toggle(false, false); }
    if (narrow.addEventListener) narrow.addEventListener('change', reset);
    else narrow.addListener(reset);
    function route(url) {
        var p = url.pathname.toLowerCase().replace(/\/$/, '').replace(/\/index$/, '');
        var article = p.match(/^\/article(?:\/index)?\/(\d+)$/);
        if (article) return '/article:' + article[1];
        if (p === '/home' || p === '') p = '/';
        return p + (p === '/news' ? ':' + (url.searchParams.get('owen1') || (url.searchParams.get('userLang') === '_en' ? 'News' : '最新动态')) : '')
            + (p === '/article' ? ':' + (url.searchParams.get('ID') || url.searchParams.get('id') || '') : '');
    }
    var current = route(new URL(window.location.href));
    var section = document.querySelector('[data-section]');
    var sectionKey = section && section.getAttribute('data-section');
    sectionKey = { outputs: 'research', facilities: 'research' }[sectionKey] || sectionKey;
    nav.querySelectorAll('a').forEach(function (a) {
        if (section ? a.getAttribute('data-nav') === sectionKey : route(new URL(a.href)) === current) a.setAttribute('aria-current', 'page');
        a.addEventListener('click', function () { toggle(false, false); });
    });
})();

/* Progressive publication filtering; all papers remain readable without JavaScript. */
(function () {
    'use strict';
    document.querySelectorAll('[data-publication-library]').forEach(function (root) {
        var papers = Array.from(root.querySelectorAll('[data-paper-group]'));
        var controls = Array.from(root.querySelectorAll('[data-paper-filter]'));
        if (!papers.length || !controls.length) return;
        controls.forEach(function (button) {
            button.addEventListener('click', function () {
                var group = button.dataset.paperFilter, count = 0;
                papers.forEach(function (paper) { paper.hidden = group !== 'all' && paper.dataset.paperGroup !== group; if (!paper.hidden) count++; });
                controls.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
                root.querySelector('[data-paper-count]').textContent = count + ' / ' + papers.length;
            });
        });
        root.classList.add('papers-ready');
    });
})();
