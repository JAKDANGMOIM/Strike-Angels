using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    [Header("이동 설정")]
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float rotationSpeed = 180f;
    
    [Header("애프터버너 설정")]
    [SerializeField] private float afterburnerSpeedMultiplier = 1.5f;
    [SerializeField] private float afterburnerDuration = 2f;
    [SerializeField] private float afterburnerCooldown = 5f;
    [SerializeField] private GameObject afterburnerVFX;
    
    [Header("화면 경계 설정")]
    [SerializeField] private float screenBorderPadding = 0.5f;

    // 내부 변수
    private Rigidbody2D rb;
    private Vector2 movementInput;
    private float currentSpeed;
    private bool afterburnerActive = false;
    private float afterburnerTimer = 0f;
    private float afterburnerCooldownTimer = 0f;
    
    // 화면 경계 계산용 변수
    private float minX, maxX, minY, maxY;

    // 애니메이터 (나중에 추가될 수 있음)
    private Animator animator;

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        animator = GetComponent<Animator>();
        currentSpeed = moveSpeed;
        
        // 애프터버너 VFX 초기 설정
        if (afterburnerVFX != null)
        {
            afterburnerVFX.SetActive(false);
        }
    }
    
    private void Start()
    {
        // 화면 경계 계산
        CalculateScreenBounds();
    }

    private void Update()
    {
        // 애프터버너 타이머 및 쿨다운 업데이트
        UpdateAfterburnerTimers();
        
        // 입력 처리
        HandleInput();
        
        // 화면 내에 플레이어 유지
        KeepPlayerOnScreen();
    }

    private void FixedUpdate()
    {
        // 이동 및 회전 처리
        Move();
    }

    private void HandleInput()
    {
        // 키보드 입력 처리 (추후 Input System으로 변경 가능)
        float horizontal = Input.GetAxisRaw("Horizontal");
        float vertical = Input.GetAxisRaw("Vertical");
        
        movementInput = new Vector2(horizontal, vertical).normalized;
        
        // 애프터버너 활성화 (쿨다운이 끝났고 현재 비활성 상태일 때)
        if (Input.GetKeyDown(KeyCode.LeftShift) && !afterburnerActive && afterburnerCooldownTimer <= 0)
        {
            ActivateAfterburner();
        }
    }

    private void Move()
    {
        // 회전 처리 - 수정된 회전 로직
        if (movementInput != Vector2.zero)
        {
            // 목표 각도 계산 (방향 입력에 따라)
            float targetAngle = Mathf.Atan2(movementInput.y, movementInput.x) * Mathf.Rad2Deg - 90f;
            
            // 현재 각도에서 목표 각도로 부드럽게 회전
            float currentAngle = transform.eulerAngles.z;
            // 각도가 180도를 넘어갈 때 문제 해결
            if (currentAngle > 180f) currentAngle -= 360f;
            
            // 부드러운 회전을 위해 SmoothDampAngle 사용
            float newAngle = Mathf.SmoothDampAngle(currentAngle, targetAngle, ref rotationVelocity, 0.1f);
            transform.rotation = Quaternion.Euler(0f, 0f, newAngle);
        }
        
        // 전진 이동 (항상 전방으로 이동)
        Vector2 moveDirection = transform.up;
        rb.linearVelocity = moveDirection * currentSpeed;
    }
    
    // 회전 속도 저장용 변수
    private float rotationVelocity;

    private void UpdateAfterburnerTimers()
    {
        // 애프터버너 활성 타이머 갱신
        if (afterburnerActive)
        {
            afterburnerTimer -= Time.deltaTime;
            
            if (afterburnerTimer <= 0)
            {
                DeactivateAfterburner();
            }
        }
        
        // 애프터버너 쿨다운 타이머 갱신
        if (afterburnerCooldownTimer > 0)
        {
            afterburnerCooldownTimer -= Time.deltaTime;
        }
    }

    private void ActivateAfterburner()
    {
        afterburnerActive = true;
        afterburnerTimer = afterburnerDuration;
        currentSpeed = moveSpeed * afterburnerSpeedMultiplier;
        
        // 애프터버너 시각 효과 활성화
        if (afterburnerVFX != null)
        {
            afterburnerVFX.SetActive(true);
        }
    }

    private void DeactivateAfterburner()
    {
        afterburnerActive = false;
        currentSpeed = moveSpeed;
        afterburnerCooldownTimer = afterburnerCooldown;
        
        // 애프터버너 시각 효과 비활성화
        if (afterburnerVFX != null)
        {
            afterburnerVFX.SetActive(false);
        }
    }
    
    private void CalculateScreenBounds()
    {
        // 카메라의 화면 경계 계산
        Camera mainCamera = Camera.main;
        if (mainCamera != null)
        {
            Vector2 screenBounds = mainCamera.ScreenToWorldPoint(
                new Vector3(Screen.width, Screen.height, mainCamera.transform.position.z)
            );
            
            // 플레이어 크기를 고려한 경계 설정
            float playerWidth = GetComponent<Renderer>().bounds.extents.x;
            float playerHeight = GetComponent<Renderer>().bounds.extents.y;
            
            minX = -screenBounds.x + playerWidth + screenBorderPadding;
            maxX = screenBounds.x - playerWidth - screenBorderPadding;
            minY = -screenBounds.y + playerHeight + screenBorderPadding;
            maxY = screenBounds.y - playerHeight - screenBorderPadding;
        }
    }
    
    private void KeepPlayerOnScreen()
    {
        // 현재 위치 가져오기
        Vector3 playerPosition = transform.position;
        
        // X와 Y 위치를 화면 내로 제한
        playerPosition.x = Mathf.Clamp(playerPosition.x, minX, maxX);
        playerPosition.y = Mathf.Clamp(playerPosition.y, minY, maxY);
        
        // 위치 적용
        transform.position = playerPosition;
    }

    // 공개 메서드 - 다른 스크립트에서 접근 가능

    // 애프터버너 쿨다운 비율 반환 (UI 표시용)
    public float GetAfterburnerCooldownRatio()
    {
        return Mathf.Clamp01(afterburnerCooldownTimer / afterburnerCooldown);
    }

    // 애프터버너 쿨다운 감소 (스킬 시스템용)
    public void ReduceAfterburnerCooldown(float reduction)
    {
        afterburnerCooldown = Mathf.Max(1f, afterburnerCooldown - reduction);
    }

    // 이동 속도 증가 (스킬 시스템용)
    public void IncreaseMoveSpeed(float increase)
    {
        moveSpeed += increase;
        if (!afterburnerActive)
        {
            currentSpeed = moveSpeed;
        }
        else
        {
            currentSpeed = moveSpeed * afterburnerSpeedMultiplier;
        }
    }
} 