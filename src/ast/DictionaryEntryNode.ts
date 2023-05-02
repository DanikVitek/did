import {Err, isErr, Ok, unwrap, unwrapErr} from "../result";
import {tag} from "../util_parsers/basic";
import {alt, map, tuple, withError} from "../util_parsers/combinator";
import {CustomError, IResult, ParseError, Parser} from "../util_parsers/types";
import ASTNode from "./ASTNode";
import {parseASTNode} from "./composite_parsers";
import Context, {whitespaceOffset} from "./Context";
import NumberNode from "./NumberNode";
import {IDENT} from "./ObjectEntryNode";
import TextNode from "./TextNode";

export default class DictionaryEntryNode extends ASTNode {
    constructor(
        public readonly key: TextNode | NumberNode,
        public readonly value: ASTNode,
        context: Context,
    ) {
        super(context);
    }

    static parse(input: string, context: Context): IResult<[DictionaryEntryNode, Context]> {
        const parseResult = parseEntry(input, context);
        if (isErr(parseResult)) {
            return Err(new ParseError(
                `запис словника (${unwrapErr(parseResult)})`,
                input,
                new CustomError("Розбір запису словника"),
            ));
        }
        const [rest, [key, value, newContext]] = unwrap(parseResult);
        return Ok([rest, [new DictionaryEntryNode(key, value, context), newContext]]);
    }

    toString(): string {
        return `DictionaryEntryNode({ key: ${this.key}, value: ${this.value} })`;
    }
}

const ENTRY_KEY_VALUE_SEPARATOR = tuple(whitespaceOffset, tag("="), whitespaceOffset);

function parseEntry(input: string, context: Context): IResult<[TextNode | NumberNode, ASTNode, Context]> {
    const keyResult = withError(
        alt(
            map(
                IDENT,
                ident => [new TextNode(ident, context), context.addColumns(ident.length)],
            ) as Parser<[TextNode | NumberNode, Context]>,
            (i => TextNode.parse(i, context)) as Parser<[TextNode | NumberNode, Context]>,
            (i => NumberNode.parse(i, context)) as Parser<[TextNode | NumberNode, Context]>,
        ),
        new ParseError(
            "ключ запису словника: текст або число",
            input,
            new CustomError("Розбір ключа запису словника"),
        ),
    )(input);
    if (isErr(keyResult)) {
        return keyResult;
    }
    let [rest, [key, newContext]] = unwrap(keyResult);

    const sepResult = withError(
        ENTRY_KEY_VALUE_SEPARATOR,
        new ParseError(
            '=',
            rest,
            new CustomError("Розбір розділювача ('=') запису словника"),
        ),
    )(rest);
    if (isErr(sepResult)) {
        return sepResult;
    }
    const [rest1, [ws1, , ws2]] = unwrap(sepResult);
    newContext = newContext.addRows(ws1.rows).addColumns(ws1.columns + 1).addRows(ws2.rows).addColumns(ws2.columns);

    const valueResult = parseASTNode(rest1, newContext);
    if (isErr(valueResult)) {
        return valueResult;
    }
    const [rest2, [value, newContext1]] = unwrap(valueResult);

    return Ok([rest2, [key, value, newContext1]]);
}
