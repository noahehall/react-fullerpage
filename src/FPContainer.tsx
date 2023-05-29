import {
  type CSSProperties,
  type FC,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion, type MotionProps } from "framer-motion";

import { FPContext } from ".";

const isSsr = typeof window === "undefined" || typeof document === "undefined";

export interface FPContainerInterface {
  children: ReactNode;
  //
  className?: string;
  keyboardShortcut?: boolean;
  motionProps?: MotionProps;
  onChange?: Function;
  onHide?: Function;
  onShow?: Function;
  outerStyle?: CSSProperties;
  scrollDebounceMs?: number;
  style?: CSSProperties;
  transitionTiming?: number;
}
export const FPContainer: FC<FPContainerInterface> = ({
  children,
  //
  className = "",
  keyboardShortcut = true,
  motionProps = {},
  onChange,
  onHide,
  onShow,
  outerStyle = {},
  scrollDebounceMs = 125,
  style = {},
  transitionTiming = 700,
}) => {
  const FPContainerInnerRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<Timer>(null);
  // @see https://developer.mozilla.org/en-US/docs/Web/API/Window/pageYOffset
  // ^ IE users dont deserve our support
  const scrollY = useRef<number>(isSsr ? 0 : window.scrollY);
  const throttled = useRef<boolean>(false);
  const ticking = useRef<boolean>(false);

  const useOuterStyle = useMemo(
    () => ({
      left: 0,
      position: "fixed" as const,
      right: 0,
      top: 0,
      ...outerStyle,
    }),
    [outerStyle]
  );

  const useStyle = useMemo(
    () => ({
      position: "absolute" as const,
      left: 0,
      right: 0,
      ...style,
    }),
    [style]
  );

  const { ReactFPRef, slides, isFullscreen } = useContext(FPContext);

  const [, startTransition] = useTransition();

  const [pageState, setPageState] = useState({
    fullpageHeight: 0,
    offsetHeight: 0,
    resetScroll: false,
    slideIndex: 0,
    transitionTiming,
    translateY: 0,
    viewportHeight: 0,
  });

  // @see https://developer.mozilla.org/en-US/docs/Web/API/Document/scroll_event
  const handleScroll = () => {
    if (throttled.current || isSsr) return;
    throttled.current = true;

    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        const newScrollY = window.scrollY;
        const prevScrollY = scrollY.current;

        if (newScrollY === 0) first();
        else if (
          window.innerHeight + Math.round(newScrollY) >=
          document.body.offsetHeight
        )
          last();
        else if (prevScrollY < newScrollY) forward();
        else if (prevScrollY > newScrollY) back();

        if (
          pageState.resetScroll ||
          transitionTiming !== pageState.transitionTiming
        )
          startTransition(() => {
            setPageState((prevState) => ({
              ...prevState,
              resetScroll: false,
              transitionTiming,
            }));
          });

        ticking.current = false;
      });
      ticking.current = true;
    }

    setTimeout(() => {
      throttled.current = false;
    }, transitionTiming);
  };

  const bouncedHandleScroll = () => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => handleScroll(), scrollDebounceMs);
  };

  const handleResize = () => {
    if (!FPContainerInnerRef.current || isSsr) return;

    const curHeight = Math.max(
      document.documentElement.clientHeight,
      window.innerHeight
    );

    // shortcircuit
    if (
      pageState.fullpageHeight === FPContainerInnerRef.current!.clientHeight &&
      pageState.viewportHeight === curHeight
    )
      return;

    if (!ticking.current) {
      requestAnimationFrame(() => {
        const fullpageHeight = FPContainerInnerRef.current!.clientHeight;

        startTransition(() => {
          setPageState((prevState) => ({
            ...prevState,
            fullpageHeight,
            viewportHeight: Math.max(
              document.documentElement.clientHeight,
              window.innerHeight
            ),
          }));
        });
        ReactFPRef.current!.style.height = `${fullpageHeight}px`;
        ticking.current = false;
      });
      ticking.current = true;
    }
  };

  const handleKeys = (event: KeyboardEvent<Element>) => {
    if (!keyboardShortcut) return;

    switch (event.code) {
      case "PageDown":
      case "ArrowRight":
      case "ArrowDown": {
        event.stopPropagation();
        return forward();
      }
      case "PageUp":
      case "ArrowLeft":
      case "ArrowUp": {
        event.stopPropagation();
        return back();
      }
      case "End": {
        event.stopPropagation();
        return last();
      }
      case "Home": {
        event.stopPropagation();
        return first();
      }
    }
  };

  const goto = (slideIndex: number, resetScroll = false) => {
    if (!slides[slideIndex] || pageState.slideIndex === slideIndex || isSsr)
      return;

    const { transitionTiming, fullpageHeight, viewportHeight } = pageState;

    const newSlide = slides[slideIndex];

    const translateY = Math.max(
      (fullpageHeight - viewportHeight) * -1,
      newSlide.current.offsetTop * -1
    );

    // TODO(noah): no clue what the original author meant
    if (typeof onHide === "function") {
      setTimeout(() => onHide(translateY, transitionTiming));
    }

    throttled.current = true;

    const newPageState = {
      offsetHeight: newSlide.current.offsetHeight,
      resetScroll,
      slideIndex,
      translateY,
    };

    startTransition(() => {
      setPageState((prevState) => ({ ...prevState, ...newPageState }));
    });

    setTimeout(() => {
      throttled.current = false;
      scrollY.current = window.scrollY;
    }, transitionTiming);
    // TODO(noah): no clue what the original author meant
    if (typeof onShow === "function") {
      onShow(newPageState);
    }
    // TODO(noah): no clue what the original author meant
    if (typeof onChange === "function") {
      onChange({ ...newPageState, slideIndex, slides });
    }
  };

  const last = () => {
    if (slides.length <= 1) return;

    goto(slides.length - 1, true);
  };

  const back = () => {
    if (slides.length <= 1) return;

    switch (pageState.slideIndex) {
      case 0:
        return last();
      default:
        return goto(pageState.slideIndex - 1, true);
    }
  };

  const first = () => {
    if (slides.length <= 1) return;

    goto(0, true);
  };

  const forward = () => {
    if (slides.length <= 1) return;

    switch (pageState.slideIndex) {
      case slides.length - 1:
        return first();
      default:
        return goto(pageState.slideIndex + 1, true);
    }
  };

  useEffect(() => {
    if (isSsr) return;

    window.addEventListener("scroll", bouncedHandleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("keydown", handleKeys, { passive: true });

    return () => {
      window.removeEventListener("scroll", bouncedHandleScroll);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", handleKeys);
    };
  });

  useLayoutEffect(() => {
    handleResize();
    handleScroll();
  }, [isFullscreen]);

  return (
    <div style={useOuterStyle}>
      <motion.div
        ref={FPContainerInnerRef}
        className={className}
        style={{
          transition: `transform ${pageState.transitionTiming}ms cubic-bezier(0.645, 0.045, 0.355, 1.000)`,
          transform: `translate3D(0, ${pageState.translateY}px, 0)`,
          ...useStyle,
        }}
        {...motionProps}
      >
        {children}
      </motion.div>
    </div>
  );
};
