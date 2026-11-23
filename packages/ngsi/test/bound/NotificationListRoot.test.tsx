import { NotificationList } from "@vela-tools/ui";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithNgsi } from "../renderWithNgsi";
import { NotificationListRoot, type NotificationListRootProps } from "../../src/bound/NotificationListRoot";

afterEach(cleanup);

function List(props: Partial<NotificationListRootProps>) {
    return (
        <NotificationListRoot {...props}>
            <NotificationList.Error />
            <NotificationList.Table />
        </NotificationListRoot>
    );
}

describe("NotificationListRoot", () => {
    it("lists notifications with the subscription names", async () => {
        renderWithNgsi(<List />);
        expect(await screen.findByText('{"peopleCount":104}')).toBeTruthy();
        await waitFor(() => expect(screen.getAllByText("Crowd flow above 100 people").length).toBeGreaterThan(0));
    });

    it("filters by subscription", async () => {
        renderWithNgsi(<List subscriptionId="urn:ngsi-ld:Subscription:camera-faulty" />);
        expect(await screen.findByText("No notifications")).toBeTruthy();
        expect(screen.queryByText('{"peopleCount":104}')).toBeNull();
    });

    it("applies the limit", async () => {
        renderWithNgsi(<List limit={1} />);
        await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
    });

    it("shows a failed request", async () => {
        renderWithNgsi(<List />, { failOn: ["notifications.list"] });
        expect(await screen.findByRole("alert")).toBeTruthy();
    });
});
