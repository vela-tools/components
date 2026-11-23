import type { ReactNode } from "react";
import { Button } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";
import { useBrokerConfigEditing } from "../BrokerConfig.context";
import type { PartProps } from "./types";

export type BrokerConfigNewButtonProps = PartProps & { children?: ReactNode };

export function NewButton({ children = "New broker", className, style }: BrokerConfigNewButtonProps) {
    const { editing, edit } = useBrokerConfigEditing("NewButton");
    if (editing) return null;
    return (
        <Button
            size="sm"
            variant="default"
            leftSection={<PlusIcon size={14} />}
            onClick={() => edit(null)}
            className={className}
            style={style}
        >
            {children}
        </Button>
    );
}
