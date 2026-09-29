<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($requestMethod === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

$ordersFile = $dataDir . '/orders.json';
$categoriesFile = $dataDir . '/categories.json';
$categorizedFile = $dataDir . '/categorized_orders.json';
$companyFile = $dataDir . '/company.json';

function json_read($path, $default = []) {
    if (!file_exists($path)) {
        return $default;
    }
    $content = file_get_contents($path);
    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : $default;
}

function json_write($path, $data) {
    $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($encoded === false) {
        return false;
    }
    return file_put_contents($path, $encoded, LOCK_EX) !== false;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_data':
        $orders = json_read($ordersFile, []);
        $categories = json_read($categoriesFile, []);
        $categorized = json_read($categorizedFile, ['assignments' => new stdClass()]);
        if (empty($categorized['assignments']) || (is_array($categorized['assignments']) && count($categorized['assignments']) === 0)) {
            $categorized['assignments'] = new stdClass();
        }
        $company = json_read($companyFile, [
            'companyName' => 'Ravikanta Doors',
            'tagline' => 'Quality Door Manufacturing',
            'address' => '#76 Kattamnallur Village, Bidarahalli Hobli Banglore East Taluk-560049',
            'phone' => '+91 8884782543',
            'gstin' => '29AADFO4662K1ZU',
            'printHeaderTitle' => 'ORDER LIST'
        ]);

        echo json_encode([
            'success' => true,
            'orders' => $orders,
            'categories' => $categories,
            'categorized' => $categorized,
            'company' => $company
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        break;

    case 'save_categories':
        if ($requestMethod !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            exit;
        }
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true);
        if (!isset($payload['categories']) || !is_array($payload['categories'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid categories data']);
            exit;
        }
        if (json_write($categoriesFile, $payload['categories'])) {
            echo json_encode(['success' => true, 'categories' => $payload['categories']]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to save categories']);
        }
        break;

    case 'save_orders':
        if ($requestMethod !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            exit;
        }
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true);
        if (!isset($payload['orders']) || !is_array($payload['orders'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid orders data']);
            exit;
        }
        if (json_write($ordersFile, $payload['orders'])) {
            echo json_encode(['success' => true, 'ordersCount' => count($payload['orders'])]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to save orders']);
        }
        break;

    case 'save_categorized':
        if ($requestMethod !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            exit;
        }
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true);
        if (!isset($payload['assignments'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid assignment data']);
            exit;
        }
        $payload['updatedAt'] = date('Y-m-d H:i:s');
        if (empty($payload['assignments'])) {
            $payload['assignments'] = new stdClass();
        }
        if (json_write($categorizedFile, $payload)) {
            echo json_encode(['success' => true, 'categorized' => $payload], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to save categorized data']);
        }
        break;

    case 'save_company':
        if ($requestMethod !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            exit;
        }
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true);
        if (!isset($payload['company']) || !is_array($payload['company'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid company data']);
            exit;
        }
        if (json_write($companyFile, $payload['company'])) {
            echo json_encode(['success' => true, 'company' => $payload['company']]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to save company data']);
        }
        break;

    case 'reset_sample':
        if ($requestMethod !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            exit;
        }
        $sampleFile = $dataDir . '/sample_orders.json';
        if (file_exists($sampleFile)) {
            $sampleOrders = json_read($sampleFile, []);
            json_write($ordersFile, $sampleOrders);
            // clear categorized
            json_write($categorizedFile, ['assignments' => new stdClass(), 'updatedAt' => date('Y-m-d H:i:s')]);
            echo json_encode(['success' => true, 'orders' => $sampleOrders], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Sample file not found']);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
        break;
}
