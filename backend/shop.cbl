identification division.
program-id. shop.

data division.
working-storage section.
01 command-argument pic x(20).
01 input-line pic x(21).
01 item-index pic 9.
01 total-cents pic 9(15) comp-3.
01 order-items.
   05 order-item occurs 3 times.
      10 quantity-sign pic x.
      10 item-quantity pic 9(6).
      10 item-price pic 9(8).
      10 item-stock pic 9(6).
      10 remaining-stock pic 9(6).

procedure division.
main.
    accept command-argument from command-line
    if command-argument = "--health"
        display "COBOL_READY"
        stop run
    end-if

    perform varying item-index from 1 by 1 until item-index > 3
        accept input-line
        if (input-line(1:1) not = "+" and input-line(1:1) not = "-")
            or input-line(2:6) is not numeric
            or input-line(8:8) is not numeric
            or input-line(16:6) is not numeric
            display "ERROR|Invalid checkout data."
            stop run
        end-if
        move input-line(1:1) to quantity-sign(item-index)
        move input-line(2:6) to item-quantity(item-index)
        move input-line(8:8) to item-price(item-index)
        move input-line(16:6) to item-stock(item-index)
    end-perform

    move 0 to total-cents
    perform varying item-index from 1 by 1 until item-index > 3
        if quantity-sign(item-index) = "-"
            display "ERROR|Quantities cannot be negative."
            stop run
        end-if
        if item-quantity(item-index) > item-stock(item-index)
            display "ERROR|One or more quantities exceed available stock."
            stop run
        end-if
        compute remaining-stock(item-index) =
            item-stock(item-index) - item-quantity(item-index)
        compute total-cents = total-cents +
            item-quantity(item-index) * item-price(item-index)
    end-perform

    display "OK|" remaining-stock(1) "|" remaining-stock(2) "|"
        remaining-stock(3) "|" total-cents
    stop run.
