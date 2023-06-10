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
  useCallback,
} from "react";
import {
  motion,
  useScroll,
  useMotionValueEvent,
  type MotionProps,
} from "framer-motion";

import { FPContext } from ".";

export interface FPContainerInterface {
  children: ReactNode;
  //
  className?: string;
  keyboardShortcut?: boolean;
  motionProps?: MotionProps;
  onChange?: (state: object, prevIndex: number, nextIndex: number) => void;
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
  outerStyle = {},
  scrollDebounceMs = 125,
  style = {},
  transitionTiming = 0.5,
}) => {
  const FPContainerInnerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
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
    translateY: 0,
    viewportHeight: 0,
  });

  const goto = useCallback(
    (slideIndex: number, resetScroll = false) => {
      if (!slides[slideIndex] || pageState.slideIndex === slideIndex) return;

      const { fullpageHeight, viewportHeight } = pageState;

      const newSlide = slides[slideIndex];

      const translateY = Math.max(
        (fullpageHeight - viewportHeight) * -1,
        newSlide.current.offsetTop * -1
      );

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
      }, transitionTiming * 1000);

      if (typeof onChange === "function")
        onChange(newPageState, pageState.slideIndex, slideIndex);
    },
    [onChange, transitionTiming, pageState, slides]
  );

  const last = useCallback(() => {
    if (slides.length <= 1) return;

    goto(slides.length - 1, true);
  }, [slides, goto]);

  const back = useCallback(() => {
    if (slides.length <= 1) return;

    switch (pageState.slideIndex) {
      case 0:
        return last();
      default:
        return goto(pageState.slideIndex - 1, true);
    }
  }, [goto, last, pageState.slideIndex, slides.length]);

  const first = useCallback(() => {
    if (slides.length <= 1) return;

    goto(0, true);
  }, [slides.length, goto]);

  const forward = useCallback(() => {
    if (slides.length <= 1) return;

    switch (pageState.slideIndex) {
      case slides.length - 1:
        return first();
      default:
        return goto(pageState.slideIndex + 1, true);
    }
  }, [slides.length, pageState.slideIndex, first, goto]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (throttled.current) return;
    throttled.current = true;

    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        const newScrollY = latest;
        const prevScrollY = scrollY.prev;

        if (newScrollY === 0) first();
        else if (
          window.innerHeight + Math.round(newScrollY) >=
          document.body.offsetHeight
        )
          last();
        else if (prevScrollY < newScrollY) forward();
        else if (prevScrollY > newScrollY) back();

        if (pageState.resetScroll)
          startTransition(() => {
            setPageState((prevState) => ({
              ...prevState,
              resetScroll: false,
            }));
          });

        ticking.current = false;
      });
      ticking.current = true;
    }

    setTimeout(() => {
      throttled.current = false;
    }, transitionTiming * 1000);
  });

  const handleResize = useCallback(() => {
    if (!FPContainerInnerRef.current) return;

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
  }, [ReactFPRef, ticking, pageState.fullpageHeight, pageState.viewportHeight]);

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

  useEffect(() => {
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("keydown", handleKeys, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", handleKeys);
    };
  });

  useLayoutEffect(() => {
    handleResize();
  }, [isFullscreen, handleResize]);

  return (
    <div style={useOuterStyle}>
      <motion.div
        className={className}
        ref={FPContainerInnerRef}
        style={useStyle}
        animate={{ y: pageState.translateY }}
        transition={{
          ease: [0.17, 0.67, 0.83, 0.67],
          duration: transitionTiming,
        }}
        layout
        {...motionProps}
      >
        {children}
      </motion.div>
    </div>
  );
};
