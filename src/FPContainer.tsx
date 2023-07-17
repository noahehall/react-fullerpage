import {
  type CSSProperties,
  type FC,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
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
  style = {},
  transitionTiming = 0.5,
}) => {
  const { scrollY } = useScroll();
  const throttled = useRef<boolean>(false);

  const useStyle = useMemo(
    () => ({
      position: "relative" as const,
      left: 0,
      right: 0,
      ...style,
    }),
    [style]
  );

  const { slides, isFullscreen } = useContext(FPContext);

  const [isPending, startTransition] = useTransition();

  const [pageState, setPageState] = useState({
    slideIndex: 0,
    translateY: 0,
  });

  const goto = (slideIndex: number) => {
    if (pageState.slideIndex === slideIndex || !slides[slideIndex]) return;
    throttled.current = true;

    const newSlide = slides[slideIndex];

    const translateY = slideIndex === 0 ? 0 : newSlide.current.offsetTop;
    if (translateY === pageState.translateY) return;

    console.info("\n\n\n scrolling to", slideIndex, translateY);

    const newPageState = {
      slideIndex,
      translateY,
    };

    startTransition(() => {
      setPageState((prevState) => ({ ...prevState, ...newPageState }));
    });

    setTimeout(() => {
      throttled.current = false;
    }, transitionTiming * 2000);

    if (typeof onChange === "function")
      onChange(newPageState, pageState.slideIndex, slideIndex);
  };

  const last = () => {
    goto(slides.length - 1);
  };

  const back = () => {
    switch (pageState.slideIndex) {
      case 0:
        return last();
      default:
        return goto(pageState.slideIndex - 1);
    }
  };

  const first = () => {
    goto(0);
  };

  const forward = () => {
    switch (pageState.slideIndex) {
      case slides.length - 1:
        return first();
      default:
        return goto(pageState.slideIndex + 1);
    }
  };

  useMotionValueEvent(scrollY, "change", (latest) => {
    console.info("\n\n\n throttled check", throttled.current);
    if (throttled.current || isPending) return;
    throttled.current = true;

    const newScrollY = latest;
    const prevScrollY = scrollY.prev;

    if (newScrollY === 0) first();
    else if (prevScrollY < newScrollY) forward();
    else if (prevScrollY > newScrollY) back();
  });

  const handleKeys = (event: KeyboardEvent<Element>) => {
    if (!keyboardShortcut) return;
    console.info("\n\n in handle keys");
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
    document.addEventListener("keydown", handleKeys, { passive: true });

    return () => {
      document.removeEventListener("keydown", handleKeys);
    };
  });

  console.info("\n\n\n new page state", pageState);
  return (
    <motion.div
      id="wtf"
      className={className}
      style={useStyle}
      animate={{ y: pageState.translateY }}
      // transition={{
      //   ease: [0.17, 0.67, 0.83, 0.67],
      //   duration: transitionTiming,
      // }}
      layout
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};
