import {
  useState,
  useRef,
  useMemo,
  useDeferredValue,
  Suspense,
  type CSSProperties,
  type ReactNode,
  type ElementType,
  type FC,
} from "react";
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import { motion, type MotionProps } from "framer-motion";

import { FPContext, FSButton, type FPItemRef } from ".";

const ImLoading = () => (
  <div style={{ backgroundColor: "black", height: "100vh" }}>Loading</div>
);

export interface ReactFPInterface {
  children: ReactNode;
  //
  Button?: ElementType;
  buttonStyle?: CSSProperties;
  className?: string;
  Fallback?: ElementType;
  motionProps?: MotionProps;
  style?: CSSProperties;
}

export const ReactFP: FC<ReactFPInterface> = ({
  children,
  //
  Button = FSButton,
  buttonStyle = {},
  className = "",
  Fallback = ImLoading,
  motionProps = {},
  style = {},
}) => {
  const useStyle = useMemo(
    () => ({
      position: "relative" as const,
      ...style,
    }),
    [style]
  );
  const useButtonStyle = useMemo(
    () => ({
      position: "fixed",
      left: 10,
      top: 10,
      zIndex: 9999,
      ...buttonStyle,
    }),
    [buttonStyle]
  );

  const [slides, setSlides] = useState<FPItemRef[]>([]);
  const deferredSlides = useDeferredValue(slides);

  const fullscreen = useRef(false);
  const ReactFPRef = useRef<HTMLDivElement>(null);

  const getIndex = (slide: FPItemRef): number => {
    return slides.indexOf(slide);
  };

  const subscribe = (slide: FPItemRef): void =>
    setSlides((prevSlides) =>
      // set slides in lexical order
      [...prevSlides, slide].sort(
        ({ current: a }, { current: b }) => a.offsetTop - b.offsetTop
      )
    );

  const unsubscribe = (slide: FPItemRef): void =>
    setSlides((prevSlides) => prevSlides.filter((s) => s !== slide));

  const handle = useFullScreenHandle();

  const toggleFullScreen = () => {
    fullscreen.current
      ? handle.exit()
      : handle.enter().catch((e) => {
          console.error("unable to enter fullscreen mode", e);
        });

    fullscreen.current = !fullscreen.current;
  };

  return (
    <FullScreen handle={handle} className={`reactfp ${className}`.trim()}>
      <Button style={useButtonStyle} onClick={toggleFullScreen} />
      <FPContext.Provider
        value={{
          getIndex,
          isFullscreen: !!fullscreen.current,
          ReactFPRef,
          slides: deferredSlides,
          subscribe,
          unsubscribe,
        }}
      >
        <motion.div layout ref={ReactFPRef} style={useStyle} {...motionProps}>
          <Suspense fallback={<Fallback />}>{children}</Suspense>
        </motion.div>
      </FPContext.Provider>
    </FullScreen>
  );
};
