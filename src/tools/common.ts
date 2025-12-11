export function getEnumKeys(enumObject: any): [string, ...string[]] {
    const keys = Object.keys(enumObject).filter((key) => isNaN(Number(key)));
    if (keys.length === 0) {
        return ["Values"]; 
    }
    return [keys[0], ...keys.slice(1)];
}

export function safeEnumConvert<T>(enumObject: any, key?: string): T | undefined {
    if (!key) return undefined;
    return enumObject[key];
}
