import { ReactFP, FPContainer, FPItem } from "src/index";

export default function App() {
  return (
    <ReactFP>
      <FPContainer>
        {Array.from(Array(100).keys()).map((i) => (
          <FPItem
            key={i}
            style={{
              backgroundColor: i % 2 ? "firebrick" : "coral",
              padding: "1em",
            }}
          >
            {`slide ${i}`}
          </FPItem>
        ))}
      </FPContainer>
    </ReactFP>
  );
}
