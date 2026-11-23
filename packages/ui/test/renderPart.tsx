import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import type { JSXElementConstructor, ReactElement, ReactNode } from "react";
import { theme } from "../src/theme";

type ProviderComponent<T> = JSXElementConstructor<{ value: T; children?: ReactNode }>;

export function renderPart<T>(part: ReactElement, Provider: ProviderComponent<NoInfer<T>>, value: T) {
    return render(
        <MantineProvider theme={theme}>
            <Provider value={value}>{part}</Provider>
        </MantineProvider>,
    );
}
