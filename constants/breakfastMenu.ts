export const BREAKFAST_MENU_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <title>Nº32 Breakfast Menu</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Lora', serif;
            background: #E8DFD3;
            color: #3D2E1F;
            min-height: 100vh;
            padding: 24px 16px;
        }

        .menu-container {
            max-width: 800px;
            margin: 0 auto;
            background: linear-gradient(135deg, #F5EDE0 0%, #EDE4D6 100%);
            padding: 48px 40px;
            border: 3px solid #8B7355;
            position: relative;
        }

        .menu-container::before,
        .menu-container::after {
            content: '✦';
            position: absolute;
            font-size: 20px;
            color: #8B7355;
        }

        .menu-container::before {
            top: 15px;
            left: 15px;
        }

        .menu-container::after {
            bottom: 15px;
            right: 15px;
        }

        .corner-ornament {
            position: absolute;
            font-size: 24px;
            color: #8B7355;
        }

        .corner-tl { top: 20px; left: 20px; }
        .corner-tr { top: 20px; right: 20px; transform: scaleX(-1); }
        .corner-bl { bottom: 20px; left: 20px; transform: scaleY(-1); }
        .corner-br { bottom: 20px; right: 20px; transform: scale(-1); }

        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid #C4A87C;
            position: relative;
        }

        .header::after {
            content: '◆';
            position: absolute;
            bottom: -12px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 16px;
            color: #8B7355;
            background: #F5EDE0;
            padding: 0 15px;
        }

        .logo {
            font-family: 'Playfair Display', serif;
            font-size: 68px;
            font-weight: 700;
            color: #3D2E1F;
            letter-spacing: 6px;
            margin-bottom: 10px;
        }

        .subtitle {
            font-size: 13px;
            letter-spacing: 3px;
            color: #6B5B4F;
            text-transform: uppercase;
        }

        .service-time {
            font-family: 'Lora', serif;
            font-size: 18px;
            color: #8B7355;
            margin-top: 15px;
            font-style: italic;
        }

        .section {
            margin-bottom: 40px;
        }

        .section-title {
            font-family: 'Playfair Display', serif;
            font-size: 26px;
            font-weight: 600;
            color: #3D2E1F;
            margin-bottom: 20px;
            letter-spacing: 2px;
            text-transform: uppercase;
            text-align: center;
            position: relative;
        }

        .section-title::before,
        .section-title::after {
            content: '—';
            margin: 0 15px;
            color: #C4A87C;
        }

        .menu-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 12px 0;
            border-bottom: 1px dashed #C4A87C;
        }

        .menu-item:last-child {
            border-bottom: none;
        }

        .item-info {
            flex: 1;
            padding-right: 25px;
        }

        .item-name {
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            font-weight: 600;
            color: #3D2E1F;
            margin-bottom: 4px;
        }

        .item-description {
            font-size: 12px;
            color: #7D6E5E;
            line-height: 1.5;
        }

        .item-options {
            font-size: 11px;
            color: #9B8B78;
            margin-top: 4px;
            font-style: italic;
        }

        .item-price {
            font-family: 'Playfair Display', serif;
            font-size: 20px;
            font-weight: 600;
            color: #8B7355;
            white-space: nowrap;
        }

        .note {
            font-size: 12px;
            color: #7D6E5E;
            font-style: italic;
            margin-bottom: 25px;
            padding: 12px;
            border: 1px dashed #C4A87C;
            text-align: center;
            background: rgba(196, 168, 124, 0.1);
        }

        .divider {
            text-align: center;
            margin: 35px 0;
            color: #C4A87C;
            font-size: 14px;
            letter-spacing: 8px;
        }

        .footer {
            text-align: center;
            margin-top: 35px;
            padding-top: 25px;
            border-top: 2px solid #C4A87C;
            font-size: 11px;
            color: #7D6E5E;
            letter-spacing: 3px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="menu-container">
        <span class="corner-ornament corner-tl">❧</span>
        <span class="corner-ornament corner-tr">❧</span>
        <span class="corner-ornament corner-bl">❧</span>
        <span class="corner-ornament corner-br">❧</span>

        <header class="header">
            <div class="logo">Nº32</div>
            <div class="subtitle">32 Duke Street · The Lanes · Brighton</div>
            <div class="service-time">Breakfast · Served 9AM – 12PM</div>
        </header>

        <section class="section">
            <h2 class="section-title">Egg Dishes</h2>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Eggs Any Style</div>
                    <div class="item-description">Free range eggs your way — fried, poached or scrambled — served with toasted sourdough and butter</div>
                </div>
                <div class="item-price">£9</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Bacon &amp; Avocado Muffin</div>
                    <div class="item-description">Toasted English muffin, smashed avocado, crispy bacon and a perfectly poached egg</div>
                </div>
                <div class="item-price">£12</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Eggs Benedict</div>
                    <div class="item-description">Ham, poached eggs and rich hollandaise on a toasted English muffin, finished with chives</div>
                </div>
                <div class="item-price">£11</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Eggs Royale</div>
                    <div class="item-description">Smoked salmon, poached eggs and silky hollandaise on a toasted English muffin with chives</div>
                </div>
                <div class="item-price">£12</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Eggs Florentine</div>
                    <div class="item-description">Wilted spinach, poached eggs and house hollandaise on a toasted English muffin with chives</div>
                </div>
                <div class="item-price">£10</div>
            </div>
        </section>

        <div class="divider">◆ ◆ ◆</div>

        <section class="section">
            <h2 class="section-title">Mains</h2>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Full English</div>
                    <div class="item-description">Streaky bacon, sausage, black pudding, poached eggs, roasted tomato, mushrooms and house beans with sourdough toast</div>
                </div>
                <div class="item-price">£13.50</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Veggie Breakfast</div>
                    <div class="item-description">Plant-based sausage, smashed avocado, hashbrown, tomato, mushrooms, kale and house beans on sourdough toast</div>
                </div>
                <div class="item-price">£13.50</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Shakshuka</div>
                    <div class="item-description">Gently spiced baked eggs in tomato and pepper sauce served with toasted focaccia</div>
                    <div class="item-options">Add feta +£2.50 · Add poached eggs +£3.00</div>
                </div>
                <div class="item-price">£12.50</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Avocado Toast</div>
                    <div class="item-description">Smashed avocado on toasted focaccia with crumbled feta, pickled chilli, sesame and sumac</div>
                    <div class="item-options">Add poached eggs +£3.00</div>
                </div>
                <div class="item-price">£11.50</div>
            </div>
        </section>

        <div class="divider">◆ ◆ ◆</div>

        <section class="section">
            <h2 class="section-title">Pancakes &amp; Waffles</h2>
            <div class="note">Vegan options available on request</div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Bacon &amp; Maple</div>
                    <div class="item-description">Crispy bacon, maple syrup and honey butter</div>
                </div>
                <div class="item-price">£12</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Banana &amp; Toffee</div>
                    <div class="item-description">Fresh banana, vegan yogurt and vegan toffee sauce</div>
                </div>
                <div class="item-price">£12</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Chicken, Chilli &amp; Avocado</div>
                    <div class="item-description">Buttermilk chicken, avocado mousse, pickled chilli and chilli oil</div>
                </div>
                <div class="item-price">£14</div>
            </div>
        </section>

        <div class="divider">◆ ◆ ◆</div>

        <section class="section">
            <h2 class="section-title">Extras</h2>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Bacon / Sausage / Eggs</div>
                </div>
                <div class="item-price">£3.00</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Spinach / Feta / Avocado</div>
                </div>
                <div class="item-price">£2.50</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Tomatoes / Mushrooms</div>
                </div>
                <div class="item-price">£2.00</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Smoked Salmon</div>
                </div>
                <div class="item-price">£5.50</div>
            </div>
        </section>

        <div class="divider">◆ ◆ ◆</div>

        <section class="section">
            <h2 class="section-title">Sides</h2>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Fries / Tots</div>
                </div>
                <div class="item-price">£4.00</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Hashbrowns</div>
                </div>
                <div class="item-price">£5.00</div>
            </div>

            <div class="menu-item">
                <div class="item-info">
                    <div class="item-name">Truffle Parmesan Fries / Tots</div>
                </div>
                <div class="item-price">£6.50</div>
            </div>
        </section>

        <footer class="footer">
            All Items Prepared Fresh to Order ✦
        </footer>
    </div>
</body>
</html>`;
