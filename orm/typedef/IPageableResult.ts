export default interface IPageableResult<T> {
    readonly entries: T[];
    readonly count: string;
}
