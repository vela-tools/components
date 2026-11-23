import type { EntityTypeRef, NgsiLdEntity, Notification, SavedQuery, Subscription } from "../types";
import { NGSI_LD_CORE_CONTEXT as CONTEXT } from "../brokers/brokers";

const SDM_DEVICE = "https://smartdatamodels.org/dataModel.Device/";
const SDM_TRANSPORT = "https://smartdatamodels.org/dataModel.Transportation/";
const SDM_OSM = "https://smartdatamodels.org/dataModel.OpenStreetMap/";
const VELA = "https://example.org/vela/";

export const fixtureTypes = {
    Camera: { type: "Camera", contextUri: SDM_DEVICE },
    VirtualCameraSensor: { type: "VirtualCameraSensor", contextUri: VELA },
    CrowdFlowObserved: { type: "CrowdFlowObserved", contextUri: SDM_TRANSPORT },
    OSMPlace: { type: "OSMPlace", contextUri: SDM_OSM },
} satisfies Record<string, EntityTypeRef>;

const T = "2026-11-10T08:00:00Z";

function camera(n: number, lon: number, lat: number, status: "ok" | "faulty"): NgsiLdEntity {
    return {
        id: `urn:ngsi-ld:Camera:camera-${n}`,
        type: "Camera",
        "@context": CONTEXT,
        name: { type: "Property", value: `camera-${n}` },
        status: { type: "Property", value: status, observedAt: T },
        location: { type: "GeoProperty", value: { type: "Point", coordinates: [lon, lat] } },
    };
}

function sensor(
    cam: number,
    line: number,
    heading: "inbound" | "outbound",
    from: [number, number],
    to: [number, number],
): NgsiLdEntity {
    return {
        id: `urn:ngsi-ld:VirtualCameraSensor:camera-${cam}-line-${line}`,
        type: "VirtualCameraSensor",
        "@context": CONTEXT,
        name: { type: "Property", value: `camera-${cam}-line-${line}` },
        hasDevice: {
            type: "Relationship",
            object: `urn:ngsi-ld:Camera:camera-${cam}`,
            objectType: `${SDM_DEVICE}Camera`,
        },
        headingName: { type: "Property", value: heading },
        sensorType: { type: "Property", value: "pedestrianFlow" },
        separatorLine: {
            type: "GeoProperty",
            value: { type: "LineString", coordinates: [from, to] },
            observedAt: "2026-03-01T00:00:00Z",
        },
    };
}

function crowdFlow(
    cam: number,
    line: number,
    inbound: number,
    outbound: number,
    lon: number,
    lat: number,
): NgsiLdEntity {
    return {
        id: `urn:ngsi-ld:CrowdFlowObserved:camera-${cam}-line-${line}`,
        type: "CrowdFlowObserved",
        "@context": CONTEXT,
        peopleCount: [
            { type: "Property", value: inbound, observedAt: T, datasetId: "urn:ngsi-ld:dataset:inbound" },
            { type: "Property", value: outbound, observedAt: T, datasetId: "urn:ngsi-ld:dataset:outbound" },
        ],
        occupancy: { type: "Property", value: Math.min(1, (inbound + outbound) / 200), unitCode: "P1", observedAt: T },
        dateObservedFrom: { type: "Property", value: "2026-11-10T07:45:00Z" },
        dateObservedTo: { type: "Property", value: T },
        refSensor: {
            type: "Relationship",
            object: `urn:ngsi-ld:VirtualCameraSensor:camera-${cam}-line-${line}`,
            objectType: `${VELA}VirtualCameraSensor`,
        },
        location: { type: "GeoProperty", value: { type: "Point", coordinates: [lon, lat] } },
    };
}

export const fixtureEntities: NgsiLdEntity[] = [
    camera(1, -25.7353, 52.1029, "ok"),
    camera(2, -25.6993, 52.0705, "faulty"),
    sensor(1, 1, "inbound", [-25.7354, 52.1029], [-25.7352, 52.1028]),
    sensor(1, 2, "outbound", [-25.7354, 52.103], [-25.7352, 52.1029]),
    sensor(2, 1, "inbound", [-25.6994, 52.0705], [-25.6992, 52.0704]),
    crowdFlow(1, 1, 42, 17, -25.7353, 52.1029),
    crowdFlow(1, 2, 8, 63, -25.7353, 52.103),
    crowdFlow(2, 1, 120, 95, -25.6993, 52.0705),
    {
        id: "urn:ngsi-ld:OSMPlace:example-pier",
        type: "OSMPlace",
        "@context": CONTEXT,
        name: { type: "Property", value: "Example Pier" },
        location: {
            type: "GeoProperty",
            value: {
                type: "Polygon",
                coordinates: [
                    [
                        [-25.745, 52.114],
                        [-25.741, 52.114],
                        [-25.741, 52.117],
                        [-25.745, 52.117],
                        [-25.745, 52.114],
                    ],
                ],
            },
        },
    },
];

export const fixtureSubscriptions: Subscription[] = [
    {
        id: "urn:ngsi-ld:Subscription:crowd-high",
        description: "Crowd flow above 100 people",
        types: [fixtureTypes.CrowdFlowObserved],
        watchedAttributes: ["peopleCount"],
        q: "peopleCount>100",
        payload: { format: "keyValues" },
        status: "active",
        endpoint: { uri: "https://webhook.example.invalid/notify", accept: "application/json" },
        delivery: {
            status: "ok",
            timesSent: 3,
            timesFailed: 1,
            lastNotification: "2026-11-10T08:00:00Z",
            lastSuccess: "2026-11-10T08:00:00Z",
            lastFailure: "2026-11-10T07:45:00Z",
        },
    },
    {
        id: "urn:ngsi-ld:Subscription:camera-faulty",
        description: "Camera reports a fault",
        types: [fixtureTypes.Camera],
        watchedAttributes: ["status"],
        q: 'status=="faulty"',
        geo: { lat: 52.01, lon: -25.64, radiusKm: 2 },
        status: "paused",
        delivery: { timesSent: 0 },
    },
];

export const fixtureNotifications: Notification[] = [
    {
        id: "urn:ngsi-ld:Notification:1",
        subscriptionId: "urn:ngsi-ld:Subscription:crowd-high",
        receivedAt: "2026-11-10T07:15:00Z",
        status: "delivered",
        source: "urn:ngsi-ld:CrowdFlowObserved:camera-2-line-1",
        payload: { peopleCount: 104 },
    },
    {
        id: "urn:ngsi-ld:Notification:2",
        subscriptionId: "urn:ngsi-ld:Subscription:crowd-high",
        receivedAt: "2026-11-10T07:45:00Z",
        status: "failed",
        source: "urn:ngsi-ld:CrowdFlowObserved:camera-2-line-1",
        payload: { peopleCount: 131 },
    },
    {
        id: "urn:ngsi-ld:Notification:3",
        subscriptionId: "urn:ngsi-ld:Subscription:crowd-high",
        receivedAt: "2026-11-10T08:00:00Z",
        status: "delivered",
        source: "urn:ngsi-ld:CrowdFlowObserved:camera-2-line-1",
        payload: { peopleCount: 120 },
    },
];

export const fixtureSavedQueries: SavedQuery[] = [
    {
        id: "saved-1",
        name: "Busy crowd sensors near the centre",
        query: {
            types: [fixtureTypes.CrowdFlowObserved],
            q: "occupancy>0.5",
            geo: { label: "Centre", lat: 52.0705, lon: -25.6993, radiusKm: 2 },
        },
        createdAt: "2026-11-01T09:00:00Z",
    },
];

export const fixtureTemporal: Record<string, NgsiLdEntity> = {
    "urn:ngsi-ld:CrowdFlowObserved:camera-2-line-1": {
        id: "urn:ngsi-ld:CrowdFlowObserved:camera-2-line-1",
        type: "CrowdFlowObserved",
        "@context": CONTEXT,
        occupancy: [7, 8, 9, 10, 11, 12].map((h, i) => ({
            type: "Property",
            value: [0.2, 0.45, 0.8, 1, 0.9, 0.6][i],
            unitCode: "P1",
            observedAt: `2026-11-10T${String(h).padStart(2, "0")}:00:00Z`,
        })),
    },
};
