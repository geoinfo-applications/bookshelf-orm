"use strict";

export interface IDbConnectionProperties {
    readonly database: string;
    readonly port: number;
    readonly host: string;
    readonly user: string;
    readonly password: string;
    readonly schemas?: string[];
    readonly charset?: string;
    readonly pool?: Partial<{
        readonly min: number;
        readonly max: number;
        readonly idleTimeoutMillis: number;
        readonly reapIntervalMillis: number;
    }>;
}

export default interface IDbConnectionConfig {
    projectName: string;
    debug?: boolean;
    db: { [projectName:string]: IDbConnectionProperties };
}
