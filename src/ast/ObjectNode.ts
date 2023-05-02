import {Err, isErr, Ok, unwrap, unwrapErr} from "../result";
import {withError} from "../util_parsers/combinator";
import {CustomError, IResult, ParseError} from "../util_parsers/types";
import ASTNode from "./ASTNode";
import {listOfEntries} from "./composite_parsers";
import Context from "./Context";
import {DICTIONARY_END, DICTIONARY_START} from "./DictionaryNode";
import ObjectEntryNode, {IDENT} from "./ObjectEntryNode";

export default class ObjectNode extends ASTNode {
    constructor(
        public readonly ident: string,
        public readonly entries: ObjectEntryNode[],
        context: Context,
    ) {
        super(context);
    }

    static parse(input: string, context: Context): IResult<[ObjectNode, Context]> {
        const parseResult = parseObject(input, context);
        if (isErr(parseResult)) {
            return Err(new ParseError(
                `об'єкт (${unwrapErr(parseResult)})`,
                input,
                new CustomError("Розбір об'єкту"),
            ));
        }
        const [rest, [ident, entries, newContext]] = unwrap(parseResult);
        return Ok([rest, [new ObjectNode(ident, entries, context), newContext]]);
    }

    toString(): string {
        return `ObjectNode("${this.ident}", [${this.entries.map(e => e.toString()).join(", ")}])`;
    }
}


function parseObject(input: string, context: Context): IResult<[string, ObjectEntryNode[], Context]> {
    const identResult = withError(
        IDENT,
        new ParseError("назва об'єкту", input, new CustomError("Розбір назви об'єкту")),
    )(input);
    if (isErr(identResult)) {
        return identResult;
    }
    const [rest, ident] = unwrap(identResult);
    const newContext = context.addColumns(ident.length);
    const openParenResult = withError(
        DICTIONARY_START,
        new ParseError("(", rest, new CustomError("Розбір початку тіла об'єкту")),
    )(rest);
    if (isErr(openParenResult)) {
        return openParenResult;
    }
    const [rest2, [, offset]] = unwrap(openParenResult);
    const newContext2 = newContext.addColumns(1).addRows(offset.rows).addColumns(offset.columns);

    const listOfEntriesResult = listOfObjectEntryNodeEntries(rest2, newContext2);
    if (isErr(listOfEntriesResult)) {
        return listOfEntriesResult;
    }
    const [rest3, [entries, newContext3]] = unwrap(listOfEntriesResult);
    const closeParenResult = withError(
        DICTIONARY_END,
        new ParseError(")", rest3, new CustomError("Розбір кінця тіла об'єкту")),
    )(rest3);
    if (isErr(closeParenResult)) {
        return closeParenResult;
    }
    const [rest4, [offset2]] = unwrap(closeParenResult);
    const newContext4 = newContext3.addRows(offset2.rows).addColumns(offset2.columns + 1);

    return Ok([rest4, [ident, entries, newContext4]]);
}

function listOfObjectEntryNodeEntries(input: string, context: Context): IResult<[ObjectEntryNode[], Context]> {
    return listOfEntries(input, context, ObjectEntryNode.parse);
}
