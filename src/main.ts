import ASTNode from "./ast/ASTNode";
import Context, {whitespaceOffset} from "./ast/Context";
import DictionaryNode from "./ast/DictionaryNode";
import EmptyNode from "./ast/EmptyNode";
import ListNode from "./ast/ListNode";
import LogicalNode from "./ast/LogicalNode";
import NumberNode from "./ast/NumberNode";
import ObjectNode from "./ast/ObjectNode";
import TextNode from "./ast/TextNode";
import {Err, isErr, isOk, Ok, unwrap, unwrapErr} from "./result";
import {CustomError, IResult, ParseError} from "./util_parsers/types";

/**
 * @param {string} code
 * @return {ASTNode}
 * @throws {Error} if the code is invalid
 */
export function parse(code: string): ASTNode {
    const startResult = whitespaceOffset(code);
    if (isErr(startResult)) {
        throw new Error(unwrapErr(startResult).toString());
    }
    const [rest, offset] = unwrap(startResult);
    const parseResult = parseAST(rest, new Context(offset.rows, offset.columns));
    if (isErr(parseResult)) {
        throw new Error(unwrapErr(parseResult).toString());
    }
    let [rest1, node] = unwrap(parseResult);
    rest1 = rest1.trimEnd();
    if (rest1.length > 0) {
        throw new Error(`Unexpected trailing characters: ${rest1}`);
    }
    return node;
}

function parseAST(input: string, context: Context): IResult<ASTNode> {
    const emptyResult = EmptyNode.parse(input, context) as IResult<[ASTNode, Context]>;
    if (isOk(emptyResult)) {
        const [rest, [emptyNode]] = unwrap(emptyResult);
        return Ok([rest, emptyNode]);
    }
    const logicalResult = LogicalNode.parse(input, context) as IResult<[ASTNode, Context]>;
    if (isOk(logicalResult)) {
        const [rest, [logicalNode]] = unwrap(logicalResult);
        return Ok([rest, logicalNode]);
    }
    const numberResult = NumberNode.parse(input, context) as IResult<[ASTNode, Context]>;
    if (isOk(numberResult)) {
        const [rest, [numberNode]] = unwrap(numberResult);
        return Ok([rest, numberNode]);
    }
    const textResult = TextNode.parse(input, context) as IResult<[ASTNode, Context]>;
    if (isOk(textResult)) {
        const [rest, [textNode]] = unwrap(textResult);
        return Ok([rest, textNode]);
    }
    const objectResult = ObjectNode.parse(input, context) as IResult<[ASTNode, Context]>;
    if (isOk(objectResult)) {
        const [rest, [objectNode]] = unwrap(objectResult);
        return Ok([rest, objectNode]);
    }
    const dictResult = DictionaryNode.parse(input, context) as IResult<[ASTNode, Context]>;
    if (isOk(dictResult)) {
        const [rest, [dictNode]] = unwrap(dictResult);
        return Ok([rest, dictNode]);
    }
    const listResult = ListNode.parse(input, context) as IResult<[ASTNode, Context]>;
    if (isOk(listResult)) {
        const [rest, [listNode]] = unwrap(listResult);
        return Ok([rest, listNode]);
    }
    const message: string = [
        "Якщо ви збиралися написати порожній вузол, то він повинен бути 'пусто'.",
        "Якщо ви збиралися написати логічне значення, то воно повинно бути 'так' або 'ні'.",
        "Якщо ви збиралися написати число, то воно повинно бути десятичне, можливо від'ємне, можливо дробове.",
        "Якщо ви збиралися написати текст, то він повинен бути у лапках, без явного перенесення рядка (замість нього '\\n').",
        `Якщо ви збиралися написати об'єкт, то він повинен виглядати як 'Назва(ключ="значення")': ${unwrapErr(
            objectResult)}`,
        `Якщо ви збиралися написати словник, то він повинен виглядати як '(ключ="занчення")': ${unwrapErr(dictResult)}`,
        `Якщо ви збиралися написати список, то він повинен виглядати як '["елемент"]': ${unwrapErr(listResult)}`,
    ].join('\n');
    return Err(new ParseError("правильний синтаксис", input, new CustomError(message)));
}
