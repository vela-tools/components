import type { ReactNode } from "react";
import { Modal } from "@mantine/core";
import { useConnectionStatusContext, useConnectionStatusDetails } from "../ConnectionStatus.context";
import type { PartProps } from "./types";

export type ConnectionStatusDetailsModalProps = PartProps & { title?: ReactNode };

export function DetailsModal({ title, className, style }: ConnectionStatusDetailsModalProps) {
    const { name, details } = useConnectionStatusContext("DetailsModal");
    const { opened, close } = useConnectionStatusDetails("DetailsModal");
    if (details === undefined) return null;
    return (
        <Modal opened={opened} onClose={close} title={title ?? name} className={className} style={style}>
            {details}
        </Modal>
    );
}
