(()=>{
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='music.html')return;

  const bind=()=>{
    const stage=document.querySelector('.music-revive-stage');
    if(!stage||stage.dataset.carouselStateFix==='1')return;
    const cards=[...stage.querySelectorAll('.music-revive-card')];
    if(cards.length<2)return;

    stage.dataset.carouselStateFix='1';
    let applying=false;
    const current=()=>{
      const value=Number(stage.dataset.carouselCenter);
      return Number.isInteger(value)&&value>=0&&value<cards.length?value:Math.floor(cards.length/2);
    };
    const paint=index=>{
      const center=(index+cards.length)%cards.length;
      applying=true;
      stage.dataset.carouselCenter=String(center);
      cards.forEach((card,position)=>{
        const forward=(position-center+cards.length)%cards.length;
        const backward=(center-position+cards.length)%cards.length;
        card.classList.remove('focus','away','carousel-left','carousel-center','carousel-right','carousel-hidden');
        card.classList.add(forward===0?'carousel-center':forward===1?'carousel-right':backward===1?'carousel-left':'carousel-hidden');
      });
      requestAnimationFrame(()=>{applying=false});
    };
    const cardAt=target=>{
      const card=target.closest?.('.music-revive-card');
      return card&&stage.contains(card)?cards.indexOf(card):-1;
    };

    paint(current());

    // Capture comes before the legacy card listeners. One click first centers a
    // side card; a second click on the center card follows its album link.
    stage.addEventListener('click',event=>{
      const index=cardAt(event.target);
      if(index<0||index===current())return;
      event.preventDefault();
      event.stopImmediatePropagation();
      paint(index);
    },true);
    cards.forEach(card=>{
      card.addEventListener('mouseenter',event=>{
        event.stopImmediatePropagation();
        cards.forEach(item=>item.classList.remove('focus','away'));
      },true);
      card.addEventListener('focus',event=>{
        event.stopImmediatePropagation();
        cards.forEach(item=>item.classList.remove('focus','away'));
      },true);
    });

    // music-revive.js owns the automatic timer. Watch its center update and
    // reapply the five-plus album layout after every timer tick.
    new MutationObserver(()=>{
      if(!applying)paint(current());
    }).observe(stage,{attributes:true,attributeFilter:['data-carousel-center']});
  };

  const observer=new MutationObserver(bind);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  bind();
})();

const carouselFixStyle=document.createElement('style');
carouselFixStyle.textContent='.music-carousel .music-revive-card.carousel-left,.music-carousel .music-revive-card.carousel-center,.music-carousel .music-revive-card.carousel-right{opacity:1!important;pointer-events:auto}.music-carousel .music-revive-card.carousel-hidden{z-index:0!important;opacity:0!important;pointer-events:none!important;transform:scale(.62)!important}.music-carousel .music-revive-card.carousel-left{z-index:1!important;transform:translateX(-53%) rotate(-10deg) scale(.78)!important;filter:brightness(.6) saturate(.82)!important}.music-carousel .music-revive-card.carousel-center{z-index:3!important;transform:scale(1.04)!important;filter:none!important}.music-carousel .music-revive-card.carousel-right{z-index:1!important;transform:translateX(53%) rotate(10deg) scale(.78)!important;filter:brightness(.6) saturate(.82)!important}@media(max-width:1024px){.music-carousel .music-revive-card.carousel-left{transform:translateX(-48%) rotate(-9deg) scale(.74)!important}.music-carousel .music-revive-card.carousel-right{transform:translateX(48%) rotate(9deg) scale(.74)!important}}';
document.head.append(carouselFixStyle);
