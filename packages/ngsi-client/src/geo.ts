import type { GeoFilter } from "@vela-tools/ngsi";
import { z } from "zod";

type GeoQuery = {
    geometry: "Point";
    coordinates: [number, number];
    georel: string;
};

const NEAR = /^near;maxDistance==(\d+(?:\.\d+)?)$/;

export function toGeoQuery(geo: GeoFilter): GeoQuery {
    return {
        geometry: "Point",
        coordinates: [geo.lon, geo.lat],
        georel: `near;maxDistance==${Math.round(geo.radiusKm * 1000)}`,
    };
}

const point = z.tuple([z.number(), z.number()]);

const coordinates = z.union([
    point,
    z.string().transform((text, ctx) => {
        try {
            return point.parse(JSON.parse(text));
        } catch {
            ctx.addIssue({ code: "custom", message: "coordinates are not a [lon, lat] point" });
            return z.NEVER;
        }
    }),
]);

const unsupported = "only a near;maxDistance query around a Point on location can be read";

export const geoQuerySchema = z
    .looseObject({
        geometry: z.literal("Point", unsupported),
        coordinates,
        georel: z.string().regex(NEAR, unsupported),
        geoproperty: z.literal("location", unsupported).optional(),
    })
    .transform(({ coordinates: [lon, lat], georel }): GeoFilter => ({
        lat,
        lon,
        radiusKm: Number(NEAR.exec(georel)![1]) / 1000,
    }));
