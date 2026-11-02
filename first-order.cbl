       IDENTIFICATION DIVISION.
       PROGRAM-ID. FIRST-ORDER.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
         01 PRODUCT-CHOICE PIC 9 VALUE ZERO.
         01 ITEM-NAME PIC X(20) VALUE SPACES.
         01 UNIT-PRICE-CENTS PIC 9(5) VALUE ZERO.
         01 STOCK-AVAILABLE PIC 99 VALUE ZERO.
         01 ORDER-QUANTITY PIC 99 VALUE ZERO.
       01 ORDER-TOTAL-CENTS PIC 9(7) VALUE ZERO.
       01 STOCK-LEFT PIC 99 VALUE ZERO.
       01 ESPRESSO-STOCK PIC 99 VALUE 8.
       01 MUG-STOCK PIC 99 VALUE 12.
       01 BEANS-STOCK PIC 99 VALUE 20.
       01 DISPLAY-ESPRESSO-STOCK PIC Z9.
       01 DISPLAY-MUG-STOCK PIC Z9.
       01 DISPLAY-BEANS-STOCK PIC Z9.
       01 DISPLAY-QUANTITY PIC Z9.
       01 DISPLAY-TOTAL PIC Z(6)9.
       01 DISPLAY-STOCK PIC Z9.
       01 SHOP-ACTIVE PIC X VALUE "Y".
       PROCEDURE DIVISION.
           PERFORM UNTIL SHOP-ACTIVE = "N"
               MOVE ESPRESSO-STOCK TO DISPLAY-ESPRESSO-STOCK
               MOVE MUG-STOCK TO DISPLAY-MUG-STOCK
               MOVE BEANS-STOCK TO DISPLAY-BEANS-STOCK
               DISPLAY "CORNER SHOP"
               DISPLAY "1. ESPRESSO MACHINE - 18500 CENTS - STOCK "
                   DISPLAY-ESPRESSO-STOCK
               DISPLAY "2. CERAMIC MUG - 1250 CENTS - STOCK "
                   DISPLAY-MUG-STOCK
               DISPLAY "3. COFFEE BEANS - 1600 CENTS - STOCK "
                   DISPLAY-BEANS-STOCK
               MOVE ZERO TO PRODUCT-CHOICE
               PERFORM UNTIL PRODUCT-CHOICE >= 1
                   AND PRODUCT-CHOICE <= 3
                   DISPLAY "Choose a product (1-3): "
                       WITH NO ADVANCING
                   ACCEPT PRODUCT-CHOICE
                   IF PRODUCT-CHOICE < 1 OR PRODUCT-CHOICE > 3
                       DISPLAY "Invalid choice. Enter 1, 2, or 3."
                   END-IF
               END-PERFORM
               EVALUATE PRODUCT-CHOICE
                   WHEN 1
                       MOVE "ESPRESSO MACHINE" TO ITEM-NAME
                       MOVE 18500 TO UNIT-PRICE-CENTS
                       MOVE ESPRESSO-STOCK TO STOCK-AVAILABLE
                   WHEN 2
                       MOVE "CERAMIC MUG" TO ITEM-NAME
                       MOVE 1250 TO UNIT-PRICE-CENTS
                       MOVE MUG-STOCK TO STOCK-AVAILABLE
                   WHEN 3
                       MOVE "COFFEE BEANS" TO ITEM-NAME
                       MOVE 1600 TO UNIT-PRICE-CENTS
                       MOVE BEANS-STOCK TO STOCK-AVAILABLE
               END-EVALUATE
               IF STOCK-AVAILABLE = ZERO
                   DISPLAY "SOLD OUT. Choose another product."
               ELSE
                   MOVE ZERO TO ORDER-QUANTITY
                   PERFORM UNTIL ORDER-QUANTITY > ZERO
                       AND ORDER-QUANTITY <= STOCK-AVAILABLE
                       DISPLAY "Quantity (max " STOCK-AVAILABLE "): "
                           WITH NO ADVANCING
                       ACCEPT ORDER-QUANTITY
                       IF ORDER-QUANTITY = ZERO
                           DISPLAY "Enter a quantity greater than zero."
                       ELSE
                           IF ORDER-QUANTITY > STOCK-AVAILABLE
                               DISPLAY "Not enough stock. Try again."
                           END-IF
                       END-IF
                   END-PERFORM
                   COMPUTE ORDER-TOTAL-CENTS =
                       ORDER-QUANTITY * UNIT-PRICE-CENTS
                   COMPUTE STOCK-LEFT =
                       STOCK-AVAILABLE - ORDER-QUANTITY
                   EVALUATE PRODUCT-CHOICE
                       WHEN 1
                           MOVE STOCK-LEFT TO ESPRESSO-STOCK
                       WHEN 2
                           MOVE STOCK-LEFT TO MUG-STOCK
                       WHEN 3
                           MOVE STOCK-LEFT TO BEANS-STOCK
                   END-EVALUATE
                   MOVE ORDER-QUANTITY TO DISPLAY-QUANTITY
                   MOVE ORDER-TOTAL-CENTS TO DISPLAY-TOTAL
                   MOVE STOCK-LEFT TO DISPLAY-STOCK
                   DISPLAY "ORDER ACCEPTED: " ITEM-NAME
                   DISPLAY "QUANTITY: " DISPLAY-QUANTITY
                   DISPLAY "UNIT PRICE (CENTS): " UNIT-PRICE-CENTS
                   DISPLAY "ORDER TOTAL (CENTS): " DISPLAY-TOTAL
                   DISPLAY "STOCK LEFT: " DISPLAY-STOCK
               END-IF
               DISPLAY "Shop again? (Y/N, N exits): "
                   WITH NO ADVANCING
               ACCEPT SHOP-ACTIVE
               IF SHOP-ACTIVE NOT = "N"
                   MOVE "Y" TO SHOP-ACTIVE
               END-IF
           END-PERFORM
           DISPLAY "Thanks for visiting Corner Shop."
           STOP RUN.
