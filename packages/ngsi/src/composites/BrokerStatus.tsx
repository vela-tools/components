import type { CSSProperties, ReactNode } from "react";
import { ConnectionStatusCard } from "@vela-tools/ui";
import { ConnectionStatusRoot } from "../bound/ConnectionStatusRoot";

export type BrokerStatusProps = {
    details?: ReactNode;
    className?: string;
    style?: CSSProperties;
};

export function BrokerStatus({ details, className, style }: BrokerStatusProps) {
    return (
        <ConnectionStatusRoot details={details}>
            <ConnectionStatusCard.Card className={className} style={style} />
            <ConnectionStatusCard.DetailsModal />
        </ConnectionStatusRoot>
    );
}
