export function rememberScroll(view) {
  const scroller = view.scrollDOM;
  let top = 0;
  let left = 0;

  scroller.addEventListener("scroll", () => {
    if (scroller.clientHeight === 0) return;
    top = scroller.scrollTop;
    left = scroller.scrollLeft;
  });

  return function restore() {
    scroller.scrollTop = top;
    scroller.scrollLeft = left;
  };
}
