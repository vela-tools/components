import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import classes from "./AppFrame.module.css";

type FrameElementProps = {
    className?: string;
    style?: CSSProperties;
};

export type AppFrameProps = FrameElementProps & {
    masthead?: ReactNode;
    toolbar?: ReactNode;
    statusBar?: ReactNode;
    children?: ReactNode;
};

export function AppFrame({ masthead, toolbar, statusBar, children, className, style }: AppFrameProps) {
    return (
        <div className={clsx(classes.AppFrame, className)} style={style}>
            {masthead}
            {toolbar}
            <main className={classes.Main}>{children}</main>
            {statusBar}
        </div>
    );
}

export type MastheadProps = FrameElementProps & {
    appName: ReactNode;
    brand?: ReactNode;
    icon?: ReactNode;
    edition?: ReactNode;
    version?: string;
    children?: ReactNode;
};

export function Masthead({
    appName,
    brand = "Vela",
    icon,
    edition,
    version,
    children,
    className,
    style,
}: MastheadProps) {
    return (
        <header className={clsx(classes.Masthead, className)} style={style}>
            <div className={classes.Brand}>
                {icon && <span className={classes.Icon}>{icon}</span>}
                <span className={classes.BrandName}>{brand}</span>
                <span className={classes.Separator} aria-hidden="true">
                    /
                </span>
                <span className={classes.AppName}>{appName}</span>
            </div>
            <div className={classes.End}>
                {children}
                {edition && <span className={classes.Edition}>{edition}</span>}
                {version && <span className={classes.Version}>v{version}</span>}
            </div>
        </header>
    );
}

export type ToolBarProps = FrameElementProps & { children?: ReactNode };

export function ToolBar({ children, className, style }: ToolBarProps) {
    return (
        <div className={clsx(classes.ToolBar, className)} style={style}>
            {children}
        </div>
    );
}

export type StatusBarProps = FrameElementProps & { children?: ReactNode };

export function StatusBar({ children, className, style }: StatusBarProps) {
    return (
        <footer className={clsx(classes.StatusBar, className)} style={style}>
            {children}
        </footer>
    );
}
