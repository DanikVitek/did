import {Err, isErr, Ok, unwrap} from "../result";
import {tag} from "../util_parsers/basic";
import {CustomError, IResult, ParseError} from "../util_parsers/types";
import ASTNode from "./ASTNode";
import Context from "./Context";

const EMPTY_TAG = tag("пусто");

export default class EmptyNode extends ASTNode {
    constructor(context: Context) {
        super(context);
    }

    static parse(input: string, context: Context): IResult<[EmptyNode, Context]> {
        const parseResult = EMPTY_TAG(input);
        if (isErr(parseResult)) {
            return Err(new ParseError("пусто", input, new CustomError("Розбір вузла 'пусто'")));
        }
        const [rest] = unwrap(parseResult);
        return Ok([rest, [new EmptyNode(context), context.addColumns(5)]]);
    }

    toString(): string {
        return `EmptyNode()`;
    }
}