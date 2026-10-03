# Reusable puzzle templates

Open **Templates > Use template**. Math Maze uses a math-topic selector and numeric problems, with no word collection. The other templates accept a built-in word collection or **My own words**. For your own collection, enter a topic and paste words separated by commas or new lines; numbered and bulleted lists also work. Duplicate words are removed. Words use 3-15 English letters (2-15 for Secret Code; 3-12 for crosswords), with spaces and hyphens removed. The form shows the minimum required by the selected template.

Each book contains 1-100 activities, a title page, and matching answer pages. Changing the topic, template, or inputs creates a new book; it does not rewrite existing approved books.

| Template | Topic behavior | Minimum words |
| --- | --- | --- |
| Word Search | Hide 20 words in each 15 x 15 grid. | 24 |
| Crossword | Use your words as answers in a connected crossword. Automatic hints scramble their letters, without inventing definitions. Alternatively supply 12-60 answer/clue pairs separated by a pipe character. Clues contain 5-70 printable ASCII characters. A pool with too few shared letters is rejected. | 12 |
| Math Maze | Choose addition, subtraction, multiplication, division, fractions of numbers, decimals, percentages, negative numbers, powers, square roots, order of operations, or mixed topics. Solve numeric problems along the maze route; answers include the route and checked results. No word collection is used. | 0 |
| Secret Code | Decode 6, 8, or 10 of your words with a shuffled letter-number key. | 10 |
| Picture Sudoku / Word Sudoku | Fill a 4 x 4 grid with four topic words, once each per row, column, and 2 x 2 box. Each puzzle has exactly one solution. | 4 |
| I Spy / I Spy Words | Find and count six topic words among 36, 48, or 60 shuffled entries. | 6 |
| Color by Code / Color by Word | Match five topic words to a five-color key. Large 6 x 6 word tiles reveal a selected built-in heart, tree, flower, or rocket. The words are custom; the picture is a built-in design, not a generated illustration of the topic. | 5 |
| Logic Puzzle | Match four people to two sets of four topic words using deduction clues and letter-labeled grids. A word key keeps long vocabulary readable. All 576 assignments are checked to guarantee one solution. | 8 |

These deterministic vocabulary activities do not require an AI key. In custom-word mode, Sudoku and I Spy use printed words rather than generated pictures. Custom illustrations, automatic definition-writing, and mixed-template books are not part of this feature.

## Creating a themed crossword book

Crossword opens with **My own words** selected. Enter your book title and topic, then paste at least 12 different answers. Words-only mode creates scrambled-letter hints. For definition-based puzzles, select **Traditional crossword: my answers and clues** and enter 12-60 lines in `ANSWER | clue` format.

Easy aims for 8 answers per grid, medium 10, and hard 12. The generator tries up to 40 layouts to reach that target and otherwise keeps the fullest connected grid with at least six answers. Each page uses a selection of your vocabulary; words may repeat between pages and not every supplied word is guaranteed to appear. Larger collections offer more variety.

Puzzle and answer pages group numbered clues into Across and Down columns. The full PDF includes the title page, puzzles, and completed answer keys; a separate answer PDF is also available.

## Saved books and validation

Saved picture-based Sudoku, I Spy, arithmetic color-code, everyday crossword, and pet/snack logic editions remain readable. Requests without a word source retain those original variants for compatibility. Older Word Search books with 12 words and color-code editions with zero-based keys remain readable.

Words are stored in the book configuration and generated puzzle data, so resumed jobs, answer validation, previews, PDFs, and PNGs use the same content. Exact duplicate puzzle/page data is blocked within the owner's library; this is not a claim of conceptual originality.

After generation, review and approve the saved revision. Download the full book PDF, answer PDF, one page PNG, or all pages as a PNG ZIP. Pages are US Letter with numbered footers; PNGs are 2550 x 3300 pixels. Template previews, PDFs, and PNGs share one drawing layout.

`npm run dev` registers all eight templates before starting the app and worker. For a separately started server, run `npm run db:seed` after updating and restart the worker. No database schema migration is needed. Engine and renderer version 1.2 add vocabulary variants; saved puzzle data is not regenerated when downloading an updated layout.

Unit tests check custom and built-in vocabulary, input requirements, deterministic generation, answer corruption, unique solutions, legacy behavior, print bounds, and page counts. The browser suite creates three-activity Halloween books using custom words for all eight templates, then checks approval and PDF, answer PDF, PNG, and ZIP downloads.
